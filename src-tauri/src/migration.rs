use std::{
    os::windows::process::CommandExt,
    path::{Path, PathBuf},
    process::Command,
};

use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager};

use crate::{
    constants::{CREATE_NO_WINDOW, GAME_EXE_NAME},
    models::LegacyInstallInfo,
};

const LEGACY_SHORTCUT_DIR: &str = r"C:\ProgramData\Microsoft\Windows\Start Menu\Programs\R5Reloaded";
const LEGACY_LAUNCHER_DIR_NAME: &str = "R5R Launcher";
const LEGACY_GAME_DIR: &str = r"R5R Library\LIVE";
const LEGACY_LAUNCHER_EXE: &str = "launcher.exe";
const LEGACY_STATE_FILE: &str = "legacy_migration_state.json";
const LEGACY_SHORTCUT_UPDATE_SCRIPT_PREFIX: &str = "r5r-legacy-shortcut-update";

#[derive(Debug, Default, Serialize, Deserialize)]
struct LegacyMigrationState {
    handled_game_dirs: Vec<String>,
}

pub(crate) fn detect_legacy_install(app: &AppHandle) -> Result<Option<LegacyInstallInfo>, String> {
    let current_install_dir = crate::paths::get_install_dir()?;
    if crate::paths::has_existing_game_files(&current_install_dir) {
        return Ok(None);
    }

    let Some(info) = detect_legacy_install_from_shortcut()? else {
        return Ok(None);
    };

    if same_path(Path::new(&info.game_dir), &current_install_dir) {
        return Ok(None);
    }

    let state = read_legacy_state(app)?;
    let normalized_game_dir = normalize_path_key(Path::new(&info.game_dir));
    if state
        .handled_game_dirs
        .iter()
        .any(|value| value == &normalized_game_dir)
    {
        return Ok(None);
    }

    Ok(Some(info))
}

pub(crate) fn dismiss_legacy_install(app: &AppHandle, game_dir: &str) -> Result<(), String> {
    let mut state = read_legacy_state(app)?;
    let normalized = normalize_path_key(Path::new(game_dir));
    if !state.handled_game_dirs.iter().any(|value| value == &normalized) {
        state.handled_game_dirs.push(normalized);
    }
    write_legacy_state(app, &state)
}

pub(crate) fn start_legacy_install_migration(
    app: &AppHandle,
    requested_game_dir: &str,
) -> Result<(), String> {
    let Some(info) = detect_legacy_install_from_shortcut()? else {
        return Err("We couldn't find an existing R5Reloaded install to migrate into.".into());
    };

    if !same_path(Path::new(&info.game_dir), Path::new(requested_game_dir)) {
        return Err("The existing R5Reloaded install changed. Please try again.".into());
    }

    let current_exe = std::env::current_exe()
        .map_err(|error| format!("Failed to locate launcher executable: {error}"))?;
    let script_path = legacy_migration_script_path();
    write_legacy_migration_script(&script_path, &current_exe, &info)?;

    dismiss_legacy_install(app, &info.game_dir)?;
    spawn_legacy_migration_script(&script_path)
}

fn detect_legacy_install_from_shortcut() -> Result<Option<LegacyInstallInfo>, String> {
    let shortcut_dir = PathBuf::from(LEGACY_SHORTCUT_DIR);
    if !shortcut_dir.exists() {
        return Ok(None);
    }

    let shortcuts = std::fs::read_dir(&shortcut_dir)
        .map_err(|error| format!("Failed to inspect legacy shortcut directory: {error}"))?;

    for entry in shortcuts {
        let entry = entry.map_err(|error| format!("Failed to inspect legacy shortcut entry: {error}"))?;
        let shortcut_path = entry.path();
        let is_shortcut = shortcut_path
            .extension()
            .and_then(|value| value.to_str())
            .is_some_and(|value| value.eq_ignore_ascii_case("lnk"));
        if !is_shortcut {
            continue;
        }

        let Some(target_path) = resolve_shortcut_target(&shortcut_path)? else {
            continue;
        };

        let Some(launcher_dir) = target_path.parent() else {
            continue;
        };
        let Some(launcher_dir_name) = launcher_dir.file_name().and_then(|value| value.to_str()) else {
            continue;
        };
        if !launcher_dir_name.eq_ignore_ascii_case(LEGACY_LAUNCHER_DIR_NAME) {
            continue;
        }

        let Some(legacy_root) = launcher_dir.parent() else {
            continue;
        };
        let legacy_launcher_exe = launcher_dir.join(LEGACY_LAUNCHER_EXE);
        let game_dir = legacy_root.join(LEGACY_GAME_DIR);
        let game_exe = game_dir.join(GAME_EXE_NAME);
        if !game_exe.exists() {
            continue;
        }

        let current_exe_name = std::env::current_exe()
            .ok()
            .and_then(|path| path.file_name().map(|value| value.to_owned()))
            .unwrap_or_else(|| "r5r-launcher.exe".into());
        let target_exe = game_dir.join(current_exe_name);

        return Ok(Some(LegacyInstallInfo {
            legacy_root: legacy_root.display().to_string(),
            launcher_dir: launcher_dir.display().to_string(),
            legacy_launcher_exe: legacy_launcher_exe.display().to_string(),
            game_dir: game_dir.display().to_string(),
            target_exe: target_exe.display().to_string(),
            shortcut_dir: shortcut_dir.display().to_string(),
            shortcut_path: shortcut_path.display().to_string(),
        }));
    }

    Ok(None)
}

fn resolve_shortcut_target(shortcut_path: &Path) -> Result<Option<PathBuf>, String> {
    let shortcut = powershell_single_quote(shortcut_path);
    let script = format!(
        "$shell = New-Object -ComObject WScript.Shell; \
         $link = $shell.CreateShortcut('{shortcut}'); \
         if ($link.TargetPath) {{ Write-Output $link.TargetPath }}"
    );

    let output = Command::new("powershell")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .output()
        .map_err(|error| format!("Failed to resolve legacy shortcut target: {error}"))?;

    if !output.status.success() {
        return Ok(None);
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.is_empty() {
        return Ok(None);
    }

    Ok(Some(PathBuf::from(stdout)))
}

fn legacy_state_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|error| format!("Failed to resolve app config directory: {error}"))?;
    std::fs::create_dir_all(&dir)
        .map_err(|error| format!("Failed to create app config directory: {error}"))?;
    Ok(dir.join(LEGACY_STATE_FILE))
}

fn read_legacy_state(app: &AppHandle) -> Result<LegacyMigrationState, String> {
    let path = legacy_state_path(app)?;
    if !path.exists() {
        return Ok(LegacyMigrationState::default());
    }

    let contents = std::fs::read_to_string(&path)
        .map_err(|error| format!("Failed to read legacy migration state: {error}"))?;
    serde_json::from_str(&contents)
        .map_err(|error| format!("Failed to parse legacy migration state: {error}"))
}

fn write_legacy_state(app: &AppHandle, state: &LegacyMigrationState) -> Result<(), String> {
    let path = legacy_state_path(app)?;
    let contents = serde_json::to_string_pretty(state)
        .map_err(|error| format!("Failed to serialize legacy migration state: {error}"))?;
    std::fs::write(&path, contents)
        .map_err(|error| format!("Failed to write legacy migration state: {error}"))
}

fn legacy_migration_script_path() -> PathBuf {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    std::env::temp_dir().join(format!(
        "r5r-legacy-migrate-{}-{}.cmd",
        std::process::id(),
        now
    ))
}

fn legacy_shortcut_update_script_path() -> PathBuf {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    std::env::temp_dir().join(format!(
        "{LEGACY_SHORTCUT_UPDATE_SCRIPT_PREFIX}-{}-{}.ps1",
        std::process::id(),
        now
    ))
}

fn write_legacy_migration_script(
    script_path: &Path,
    current_exe: &Path,
    info: &LegacyInstallInfo,
) -> Result<(), String> {
    let target_exe = Path::new(&info.target_exe);
    let target_dir = target_exe
        .parent()
        .ok_or_else(|| "Failed to resolve legacy game directory.".to_string())?;
    let legacy_launcher_exe = Path::new(&info.legacy_launcher_exe);
    let legacy_launcher_dir = Path::new(&info.launcher_dir);
    let legacy_launcher_dir_name = legacy_launcher_dir
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Failed to resolve the legacy launcher directory name.".to_string())?;
    if !legacy_launcher_dir_name.eq_ignore_ascii_case(LEGACY_LAUNCHER_DIR_NAME) {
        return Err("Refusing to remove an unexpected legacy launcher directory.".into());
    }
    let shortcut_path = Path::new(&info.shortcut_path);
    let shortcut_update_script_path = legacy_shortcut_update_script_path();
    let shortcut_name = shortcut_path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Failed to resolve the legacy shortcut filename.".to_string())?;
    let shortcut_name_ps = powershell_single_quote(Path::new(shortcut_name));
    let target_exe_ps = powershell_single_quote(target_exe);
    let target_dir_ps = powershell_single_quote(target_dir);
    let shortcut_path_ps = powershell_single_quote(shortcut_path);
    let shortcut_update_script_ps = powershell_single_quote(&shortcut_update_script_path);

    let common_shortcut_script = format!(
        "$shell = New-Object -ComObject WScript.Shell;\n\
$target = '{target_exe_ps}';\n\
$work = '{target_dir_ps}';\n\
$common = '{shortcut_path_ps}';\n\
if (Test-Path -LiteralPath $common) {{\n\
  $link = $shell.CreateShortcut($common);\n\
  $link.TargetPath = $target;\n\
  $link.WorkingDirectory = $work;\n\
  $link.Save();\n\
}}\n\
Remove-Item -LiteralPath $PSCommandPath -Force -ErrorAction SilentlyContinue\n"
    );

    std::fs::write(&shortcut_update_script_path, common_shortcut_script)
        .map_err(|error| format!("Failed to create elevated shortcut update script: {error}"))?;

    let script = format!(
        "@echo off\r\n\
setlocal\r\n\
set \"SOURCE={source}\"\r\n\
set \"SOURCEDIR={source_dir}\"\r\n\
set \"TARGET={target}\"\r\n\
set \"TARGETDIR={target_dir}\"\r\n\
set \"OLDLAUNCHER={old_launcher}\"\r\n\
set \"OLDLAUNCHERDIR={old_launcher_dir}\"\r\n\
:wait_for_launcher\r\n\
copy /Y \"%SOURCE%\" \"%TARGET%\" >nul 2>&1\r\n\
if errorlevel 1 (\r\n\
  timeout /t 1 /nobreak >nul\r\n\
  goto wait_for_launcher\r\n\
)\r\n\
set \"PS_USER=$shell = New-Object -ComObject WScript.Shell; $target = '{target_exe_ps}'; $work = '{target_dir_ps}'; $userDir = Join-Path $env:APPDATA 'Microsoft\\Windows\\Start Menu\\Programs\\R5Reloaded'; if (!(Test-Path -LiteralPath $userDir)) {{ New-Item -ItemType Directory -Path $userDir -Force | Out-Null; }}; $userShortcut = Join-Path $userDir '{shortcut_name_ps}'; $userLink = $shell.CreateShortcut($userShortcut); $userLink.TargetPath = $target; $userLink.WorkingDirectory = $work; $userLink.Save()\"\r\n\
powershell -NoProfile -NonInteractive -Command \"%PS_USER%\" >nul 2>&1\r\n\
powershell -NoProfile -NonInteractive -Command \"Start-Process powershell.exe -Verb RunAs -ArgumentList '-NoProfile','-ExecutionPolicy','Bypass','-File','{shortcut_update_script_ps}'\" >nul 2>&1\r\n\
if exist \"%OLDLAUNCHERDIR%\" rmdir /s /q \"%OLDLAUNCHERDIR%\" >nul 2>&1\r\n\
start \"\" \"%TARGET%\"\r\n\
if /I not \"%SOURCEDIR%\"==\"%TARGETDIR%\" (\r\n\
  del /f /q \"%SOURCE%\" >nul 2>&1\r\n\
  rmdir \"%SOURCEDIR%\" >nul 2>&1\r\n\
)\r\n\
del /f /q \"%~f0\" >nul 2>&1\r\n",
        source = batch_quote(current_exe),
        source_dir = batch_quote(
            current_exe
                .parent()
                .ok_or_else(|| "Failed to resolve the current launcher directory.".to_string())?,
        ),
        target = batch_quote(target_exe),
        target_dir = batch_quote(target_dir),
        old_launcher = batch_quote(legacy_launcher_exe),
        old_launcher_dir = batch_quote(legacy_launcher_dir),
        shortcut_name_ps = shortcut_name_ps,
        target_dir_ps = target_dir_ps,
        target_exe_ps = target_exe_ps,
        shortcut_update_script_ps = shortcut_update_script_ps,
    );

    std::fs::write(script_path, script)
        .map_err(|error| format!("Failed to create legacy migration script: {error}"))
}

fn spawn_legacy_migration_script(script_path: &Path) -> Result<(), String> {
    Command::new("cmd")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["/C", &script_path.display().to_string()])
        .spawn()
        .map_err(|error| format!("Failed to launch legacy migration helper: {error}"))?;
    Ok(())
}

fn normalize_path_key(path: &Path) -> String {
    path.display().to_string().to_lowercase()
}

fn same_path(left: &Path, right: &Path) -> bool {
    normalize_path_key(left) == normalize_path_key(right)
}

fn powershell_single_quote(path: &Path) -> String {
    path.display().to_string().replace('\'', "''")
}

fn batch_quote(path: &Path) -> String {
    path.display().to_string().replace('"', "\"\"")
}
