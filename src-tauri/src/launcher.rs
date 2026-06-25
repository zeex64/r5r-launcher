use std::{
    collections::{BTreeSet, VecDeque},
    os::windows::process::CommandExt,
    process::Command,
    sync::atomic::Ordering,
};

use tauri::{AppHandle, Emitter, Manager};
#[cfg(windows)]
use windows_sys::Win32::Graphics::Gdi::{DEVMODEW, EnumDisplaySettingsW};

use crate::{
    launch_args::build_launch_args,
    mods::{get_installed_mods, set_mod_enabled},
    migration::{
        detect_legacy_install, dismiss_legacy_install, start_legacy_install_migration,
    },
    constants::{
        master_server_url, CREATE_NO_WINDOW, DOWNLOAD_EVENT, FINISHED_EVENT, GAME_EXE_NAME,
        VERSION_FILE_NAME,
    },
    download::{
        download_file_with_retries, download_multipart_file, download_single_file, file_matches,
    },
    manifest::{
        build_http_client, fetch_remote_game, fetch_remote_launcher, is_master_server_reachable,
    },
    models::{
        AppError, DownloadJob, GameInstallState, GameRuntimeStatus, GameSyncFinished,
        GameSyncProgress, InstalledModsState, LaunchOptions, LauncherUpdateState,
        LegacyInstallInfo, ManifestFile, MasterServerStatus, OptionalContentSummary,
        ResolutionOption,
    },
    paths::{
        get_install_dir, has_existing_game_files, manifest_path_to_fs, read_version_file,
        validate_fresh_install_directory, write_version_file,
    },
    self_update::{
        launcher_backup_path, launcher_download_path, launcher_update_script_path,
        spawn_launcher_update_script, write_launcher_update_script,
    },
};

pub use crate::models::GameSyncLock;

const MAX_DEFERRED_DOWNLOAD_ATTEMPTS: u32 = 9;

#[tauri::command]
pub async fn get_legacy_install_state(app: AppHandle) -> Result<Option<LegacyInstallInfo>, String> {
    detect_legacy_install(&app)
}

#[tauri::command]
pub async fn dismiss_legacy_install_state(app: AppHandle, game_dir: String) -> Result<(), String> {
    dismiss_legacy_install(&app, &game_dir)
}

#[tauri::command]
pub async fn start_legacy_install_migration_command(
    app: AppHandle,
    game_dir: String,
) -> Result<(), String> {
    start_legacy_install_migration(&app, &game_dir)
}

#[tauri::command]
pub async fn get_installed_mods_state() -> Result<InstalledModsState, String> {
    get_installed_mods()
}

#[tauri::command]
pub async fn set_mod_enabled_state(
    folder_name: String,
    enabled: bool,
) -> Result<InstalledModsState, String> {
    set_mod_enabled(&folder_name, enabled)
}

#[tauri::command]
pub async fn get_optional_content_summary() -> Result<OptionalContentSummary, String> {
    let remote = fetch_remote_game().await?;
    let optional_files: Vec<&ManifestFile> = remote
        .manifest
        .files
        .iter()
        .filter(|file| file.optional)
        .collect();

    Ok(OptionalContentSummary {
        file_count: optional_files.len(),
        total_bytes: optional_files.iter().map(|file| file.size).sum(),
    })
}

#[tauri::command]
pub async fn remove_optional_content() -> Result<(), String> {
    let install_dir = get_install_dir()?;
    let remote = fetch_remote_game().await?;

    for file in remote.manifest.files.iter().filter(|file| file.optional) {
        let path = manifest_path_to_fs(&install_dir, &file.path);
        if path.exists() {
            std::fs::remove_file(&path)
                .map_err(|error| format!("Failed to remove {}: {error}", path.display()))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn get_game_install_state(
    app: AppHandle,
    include_optional: bool,
) -> Result<GameInstallState, String> {
    let install_dir = get_install_dir()?;
    let game_exe = install_dir.join(GAME_EXE_NAME);
    let version_path = install_dir.join(VERSION_FILE_NAME);
    let launchable = game_exe.exists();
    let installed = has_existing_game_files(&install_dir);
    let installed_version = read_version_file(&version_path).ok();
    let busy = app.state::<GameSyncLock>().0.load(Ordering::SeqCst);

    match fetch_remote_game().await {
        Ok(remote) => {
            let remote_version = Some(remote.manifest.game_version.clone());
            let optional_status = if include_optional {
                " + HD textures"
            } else {
                ""
            };
            let state = if !installed {
                GameInstallState {
                    install_dir: install_dir.display().to_string(),
                    installed,
                    installed_version,
                    remote_version: remote_version.clone(),
                    button_label: "INSTALL".into(),
                    status_text: format!(
                        "Ready to install v{}{}",
                        remote.manifest.game_version, optional_status
                    ),
                    needs_update: false,
                    busy,
                    error: None,
                }
            } else if installed_version.is_none() {
                GameInstallState {
                    install_dir: install_dir.display().to_string(),
                    installed,
                    installed_version,
                    remote_version,
                    button_label: "UPDATE".into(),
                    status_text: "Existing install detected, verification needed".into(),
                    needs_update: true,
                    busy,
                    error: None,
                }
            } else if !launchable {
                GameInstallState {
                    install_dir: install_dir.display().to_string(),
                    installed,
                    installed_version: installed_version.clone(),
                    remote_version,
                    button_label: "UPDATE".into(),
                    status_text: "Game files found, but r5apex.exe is missing. Verification needed"
                        .into(),
                    needs_update: true,
                    busy,
                    error: None,
                }
            } else if installed_version.as_deref() == Some(remote.manifest.game_version.as_str()) {
                GameInstallState {
                    install_dir: install_dir.display().to_string(),
                    installed,
                    installed_version: installed_version.clone(),
                    remote_version,
                    button_label: "PLAY".into(),
                    status_text: format!(
                        "Installed v{}{}",
                        installed_version.unwrap_or_default(),
                        optional_status
                    ),
                    needs_update: false,
                    busy,
                    error: None,
                }
            } else {
                GameInstallState {
                    install_dir: install_dir.display().to_string(),
                    installed,
                    installed_version: installed_version.clone(),
                    remote_version: Some(remote.manifest.game_version.clone()),
                    button_label: "UPDATE".into(),
                    status_text: format!(
                        "Installed v{} - Update v{} available",
                        installed_version.unwrap_or_else(|| "Unknown".into()),
                        remote.manifest.game_version
                    ),
                    needs_update: true,
                    busy,
                    error: None,
                }
            };

            Ok(state)
        }
        Err(error) => Ok(GameInstallState {
            install_dir: install_dir.display().to_string(),
            installed,
            installed_version: installed_version.clone(),
            remote_version: None,
            button_label: if installed && launchable {
                "PLAY".into()
            } else if installed {
                "UPDATE".into()
            } else {
                "INSTALL".into()
            },
            status_text: installed_version
                .clone()
                .map(|version| format!("Installed v{}", version))
                .unwrap_or_else(|| {
                    if installed {
                        "Existing install detected, verification needed".into()
                    } else {
                        "Game not installed".into()
                    }
                }),
            needs_update: installed && (installed_version.is_none() || !launchable),
            busy,
            error: Some(error),
        }),
    }
}

#[tauri::command]
pub async fn start_game_sync(app: AppHandle, include_optional: bool) -> Result<(), AppError> {
    validate_fresh_install_directory()?;

    start_sync_task(app, move |app| async move {
        run_game_sync(&app, include_optional).await
    })
}

#[tauri::command]
pub async fn start_optional_content_sync(app: AppHandle) -> Result<(), AppError> {
    start_sync_task(app, move |app| async move { run_optional_content_sync(&app).await })
}

fn start_sync_task<F, Fut>(app: AppHandle, task: F) -> Result<(), AppError>
where
    F: FnOnce(AppHandle) -> Fut + Send + 'static,
    Fut: std::future::Future<Output = Result<String, String>> + Send + 'static,
{
    let lock = app.state::<GameSyncLock>();
    if lock
        .0
        .compare_exchange(false, true, Ordering::SeqCst, Ordering::SeqCst)
        .is_err()
    {
        return Err(AppError::message(
            "A game install or update is already running.",
        ));
    }

    tauri::async_runtime::spawn(async move {
        let result = task(app.clone()).await;
        let finished = match result {
            Ok(message) => GameSyncFinished { ok: true, message },
            Err(message) => GameSyncFinished { ok: false, message },
        };

        let _ = app.emit(FINISHED_EVENT, finished);
        app.state::<GameSyncLock>()
            .0
            .store(false, Ordering::SeqCst);
    });

    Ok(())
}

#[tauri::command]
pub async fn launch_game(options: LaunchOptions) -> Result<(), String> {
    let install_dir = get_install_dir()?;
    let game_exe = install_dir.join(GAME_EXE_NAME);

    if !game_exe.exists() {
        return Err("Game files were not found next to the launcher.".into());
    }

    let args = build_launch_args(&options)?;

    Command::new(&game_exe)
        .args(&args)
        .current_dir(&install_dir)
        .spawn()
        .map_err(|error| format!("Failed to launch r5apex.exe: {error}"))?;

    Ok(())
}

#[tauri::command]
pub async fn open_game_install_dir() -> Result<(), String> {
    let install_dir = get_install_dir()?;

    Command::new("explorer")
        .arg(&install_dir)
        .spawn()
        .map_err(|error| format!("Failed to open install folder: {error}"))?;

    Ok(())
}

#[tauri::command]
pub async fn get_master_server_status() -> Result<MasterServerStatus, String> {
    let client = build_http_client()?;
    let reachable = is_master_server_reachable(&client, &master_server_url("https")).await
        || is_master_server_reachable(&client, &master_server_url("http")).await;

    Ok(MasterServerStatus {
        reachable,
        label: if reachable {
            "Master Server Online".into()
        } else {
            "Master Server Offline".into()
        },
    })
}

#[tauri::command]
pub async fn get_game_runtime_status() -> Result<GameRuntimeStatus, String> {
    let install_dir = get_install_dir()?;
    let target_exe = install_dir.join(GAME_EXE_NAME);
    let target_exe = target_exe
        .canonicalize()
        .unwrap_or(target_exe);
    let command = format!(
        "$target = [System.IO.Path]::GetFullPath({target}); \
$count = @(Get-CimInstance Win32_Process -Filter \"Name='{game_exe}'\" | Where-Object {{ $_.ExecutablePath -and [System.IO.Path]::GetFullPath($_.ExecutablePath).Equals($target, [System.StringComparison]::OrdinalIgnoreCase) }}).Count; \
Write-Output $count",
        target = powershell_quote(&target_exe.display().to_string()),
        game_exe = GAME_EXE_NAME,
    );

    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &command])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .map_err(|error| format!("Failed to query running game processes: {error}"))?;

    if !output.status.success() {
        return Err("Failed to query running game processes.".into());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let instance_count = stdout
        .trim()
        .parse::<usize>()
        .map_err(|error| format!("Failed to parse running game process count: {error}"))?;

    Ok(GameRuntimeStatus {
        running: instance_count > 0,
        instance_count,
    })
}

#[tauri::command]
pub async fn get_primary_monitor_resolutions() -> Result<Vec<ResolutionOption>, String> {
    #[cfg(windows)]
    {
        const ENUM_CURRENT_SETTINGS: u32 = 0xFFFF_FFFF;

        let mut modes = BTreeSet::new();
        let mut mode_index = 0_u32;

        loop {
            let mut dev_mode = DEVMODEW {
                dmSize: std::mem::size_of::<DEVMODEW>() as u16,
                ..unsafe { std::mem::zeroed() }
            };

            let ok = unsafe { EnumDisplaySettingsW(std::ptr::null(), mode_index, &mut dev_mode) };
            if ok == 0 {
                break;
            }

            let width = dev_mode.dmPelsWidth;
            let height = dev_mode.dmPelsHeight;

            if width >= 640 && height >= 480 {
                modes.insert((width, height));
            }

            mode_index += 1;
        }

        if modes.is_empty() {
            let mut current_mode = DEVMODEW {
                dmSize: std::mem::size_of::<DEVMODEW>() as u16,
                ..unsafe { std::mem::zeroed() }
            };
            let ok = unsafe {
                EnumDisplaySettingsW(std::ptr::null(), ENUM_CURRENT_SETTINGS, &mut current_mode)
            };

            if ok != 0 {
                let width = current_mode.dmPelsWidth;
                let height = current_mode.dmPelsHeight;
                if width > 0 && height > 0 {
                    modes.insert((width, height));
                }
            }
        }

        let mut resolutions: Vec<ResolutionOption> = modes
            .into_iter()
            .map(|(width, height)| ResolutionOption {
                width,
                height,
                label: format!("{width} x {height}"),
            })
            .collect();

        resolutions.sort_by(|left, right| {
            let left_pixels = u64::from(left.width) * u64::from(left.height);
            let right_pixels = u64::from(right.width) * u64::from(right.height);

            right_pixels
                .cmp(&left_pixels)
                .then_with(|| right.width.cmp(&left.width))
                .then_with(|| right.height.cmp(&left.height))
        });

        Ok(resolutions)
    }

    #[cfg(not(windows))]
    {
        Ok(Vec::new())
    }
}

#[tauri::command]
pub async fn get_launcher_update_state(app: AppHandle) -> Result<LauncherUpdateState, String> {
    let local_version = app.package_info().version.to_string();

    match fetch_remote_launcher().await {
        Ok(remote) => {
            let update_available = is_remote_version_newer(&remote.version, &local_version);
            Ok(LauncherUpdateState {
                local_version: local_version.clone(),
                remote_version: Some(remote.version.clone()),
                update_available,
                status_text: if update_available {
                    format!("Launcher update v{} available", remote.version)
                } else {
                    format!("Launcher v{} is up to date", local_version)
                },
                error: None,
            })
        }
        Err(error) => Ok(LauncherUpdateState {
            local_version,
            remote_version: None,
            update_available: false,
            status_text: "Unable to check for launcher updates".into(),
            error: Some(error),
        }),
    }
}

#[tauri::command]
pub async fn start_launcher_self_update(app: AppHandle) -> Result<(), String> {
    let local_version = app.package_info().version.to_string();
    let remote = fetch_remote_launcher().await?;

    if !is_remote_version_newer(&remote.version, &local_version) {
        return Err("Launcher is already up to date.".into());
    }

    let current_exe =
        std::env::current_exe().map_err(|error| format!("Failed to locate launcher: {error}"))?;
    let downloaded_exe = launcher_download_path(&current_exe);
    let backup_exe = launcher_backup_path(&current_exe);
    let update_script = launcher_update_script_path();

    let client = build_http_client()?;
    download_file_with_retries(
        &client,
        &remote.url,
        &downloaded_exe,
        &remote.checksum,
        "launcher update",
    )
    .await?;

    write_launcher_update_script(&update_script, &current_exe, &downloaded_exe, &backup_exe)?;
    spawn_launcher_update_script(&update_script)?;
    app.exit(0);
    Ok(())
}

async fn run_game_sync(app: &AppHandle, include_optional: bool) -> Result<String, String> {
    let install_dir = get_install_dir()?;
    let remote = fetch_remote_game().await?;
    let target_files: Vec<&ManifestFile> = remote
        .manifest
        .files
        .iter()
        .filter(|file| !file.optional || include_optional)
        .collect();

    emit_progress(
        app,
        GameSyncProgress {
            stage: "preparing".into(),
            current_file: None,
            message: "Checking installed files".into(),
            downloaded_bytes: 0,
            total_bytes: 0,
            files_done: 0,
            files_total: target_files.len(),
        },
    );

    let mut jobs = Vec::new();

    for (index, file) in target_files.iter().enumerate() {
        emit_progress(
            app,
            GameSyncProgress {
                stage: "verifying".into(),
                current_file: Some(file.path.clone()),
                message: format!("Verifying {}", file.path),
                downloaded_bytes: 0,
                total_bytes: 0,
                files_done: index,
                files_total: target_files.len(),
            },
        );

        if !file_matches(&install_dir, file).await? {
            jobs.push(DownloadJob {
                file: (*file).clone(),
                attempts: 0,
            });
        }
    }

    let total_bytes: u64 = jobs
        .iter()
        .map(|job| {
            if job.file.parts.is_empty() {
                job.file.size
            } else {
                job.file.parts.iter().map(|part| part.size).sum()
            }
        })
        .sum();

    if jobs.is_empty() {
        write_version_file(
            &install_dir.join(VERSION_FILE_NAME),
            &remote.manifest.game_version,
        )
        .await?;

        emit_progress(
            app,
            GameSyncProgress {
                stage: "complete".into(),
                current_file: None,
                message: "Game is already up to date".into(),
                downloaded_bytes: total_bytes,
                total_bytes,
                files_done: target_files.len(),
                files_total: target_files.len(),
            },
        );

        return Ok("Game is already up to date.".into());
    }

    let client = build_http_client()?;
    let jobs_len = jobs.len();
    run_download_queue(
        app,
        &client,
        &remote.base_url,
        &install_dir,
        jobs,
        total_bytes,
        jobs_len,
    )
    .await?;

    write_version_file(
        &install_dir.join(VERSION_FILE_NAME),
        &remote.manifest.game_version,
    )
    .await?;

    emit_progress(
        app,
        GameSyncProgress {
            stage: "complete".into(),
            current_file: None,
            message: format!("Installed game version {}", remote.manifest.game_version),
            downloaded_bytes: total_bytes,
            total_bytes,
            files_done: jobs_len,
            files_total: jobs_len,
        },
    );

    Ok(format!(
        "Installed game version {}.",
        remote.manifest.game_version
    ))
}

async fn run_optional_content_sync(app: &AppHandle) -> Result<String, String> {
    let install_dir = get_install_dir()?;
    let remote = fetch_remote_game().await?;
    let target_files: Vec<&ManifestFile> = remote
        .manifest
        .files
        .iter()
        .filter(|file| file.optional)
        .collect();

    emit_progress(
        app,
        GameSyncProgress {
            stage: "preparing".into(),
            current_file: None,
            message: "Checking HD textures".into(),
            downloaded_bytes: 0,
            total_bytes: 0,
            files_done: 0,
            files_total: target_files.len(),
        },
    );

    let mut jobs = Vec::new();

    for (index, file) in target_files.iter().enumerate() {
        emit_progress(
            app,
            GameSyncProgress {
                stage: "verifying".into(),
                current_file: Some(file.path.clone()),
                message: format!("Verifying {}", file.path),
                downloaded_bytes: 0,
                total_bytes: 0,
                files_done: index,
                files_total: target_files.len(),
            },
        );

        if !file_matches(&install_dir, file).await? {
            jobs.push(DownloadJob {
                file: (*file).clone(),
                attempts: 0,
            });
        }
    }

    let total_bytes: u64 = jobs
        .iter()
        .map(|job| {
            if job.file.parts.is_empty() {
                job.file.size
            } else {
                job.file.parts.iter().map(|part| part.size).sum()
            }
        })
        .sum();

    if jobs.is_empty() {
        emit_progress(
            app,
            GameSyncProgress {
                stage: "complete".into(),
                current_file: None,
                message: "HD textures are already installed".into(),
                downloaded_bytes: total_bytes,
                total_bytes,
                files_done: target_files.len(),
                files_total: target_files.len(),
            },
        );

        return Ok("HD textures are already installed.".into());
    }

    let client = build_http_client()?;
    let jobs_len = jobs.len();
    run_download_queue(
        app,
        &client,
        &remote.base_url,
        &install_dir,
        jobs,
        total_bytes,
        jobs_len,
    )
    .await?;

    emit_progress(
        app,
        GameSyncProgress {
            stage: "complete".into(),
            current_file: None,
            message: "Installed HD textures".into(),
            downloaded_bytes: total_bytes,
            total_bytes,
            files_done: jobs_len,
            files_total: jobs_len,
        },
    );

    Ok("Installed HD textures.".into())
}

fn emit_progress(app: &AppHandle, progress: GameSyncProgress) {
    let _ = app.emit(DOWNLOAD_EVENT, progress);
}

async fn run_download_queue(
    app: &AppHandle,
    client: &reqwest::Client,
    base_url: &str,
    install_dir: &std::path::Path,
    jobs: Vec<DownloadJob>,
    total_bytes: u64,
    files_total: usize,
) -> Result<(), String> {
    let mut queue: VecDeque<DownloadJob> = jobs.into();
    let mut completed = 0_usize;
    let mut downloaded_bytes = 0_u64;
    let mut failures = Vec::new();

    while let Some(mut job) = queue.pop_front() {
        let result = if job.file.parts.is_empty() {
            download_single_file(
                app,
                client,
                base_url,
                install_dir,
                &job.file,
                downloaded_bytes,
                total_bytes,
                completed,
                files_total,
            )
            .await
        } else {
            download_multipart_file(
                app,
                client,
                base_url,
                install_dir,
                &job.file,
                downloaded_bytes,
                total_bytes,
                completed,
                files_total,
            )
            .await
        };

        match result {
            Ok(next_downloaded_bytes) => {
                downloaded_bytes = next_downloaded_bytes;
                completed += 1;
            }
            Err(error) => {
                job.attempts += 1;
                if job.attempts < MAX_DEFERRED_DOWNLOAD_ATTEMPTS {
                    emit_progress(
                        app,
                        GameSyncProgress {
                            stage: "retrying".into(),
                            current_file: Some(job.file.path.clone()),
                            message: format!(
                                "Retrying {} later ({}/{})",
                                job.file.path, job.attempts, MAX_DEFERRED_DOWNLOAD_ATTEMPTS
                            ),
                            downloaded_bytes,
                            total_bytes,
                            files_done: completed,
                            files_total,
                        },
                    );
                    queue.push_back(job);
                } else {
                    failures.push(format!("{} ({error})", job.file.path));
                }
            }
        }
    }

    if failures.is_empty() {
        Ok(())
    } else {
        let summary = failures.join("; ");
        Err(format!(
            "Failed to download {} file(s) after multiple attempts: {}",
            failures.len(),
            summary
        ))
    }
}

pub(crate) fn is_remote_version_newer(remote: &str, local: &str) -> bool {
    let remote_segments = version_segments(remote);
    let local_segments = version_segments(local);
    let max_len = remote_segments.len().max(local_segments.len());

    for index in 0..max_len {
        let remote_part = *remote_segments.get(index).unwrap_or(&0);
        let local_part = *local_segments.get(index).unwrap_or(&0);
        if remote_part != local_part {
            return remote_part > local_part;
        }
    }

    false
}

fn version_segments(version: &str) -> Vec<u64> {
    version
        .trim()
        .trim_start_matches(|ch: char| ch.eq_ignore_ascii_case(&'v'))
        .split('.')
        .map(|segment| segment.parse::<u64>().unwrap_or(0))
        .collect()
}

fn powershell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "''"))
}

