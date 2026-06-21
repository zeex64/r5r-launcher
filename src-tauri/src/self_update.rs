use std::{
    os::windows::process::CommandExt,
    path::{Path, PathBuf},
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};

use crate::constants::CREATE_NO_WINDOW;

pub(crate) fn launcher_download_path(current_exe: &Path) -> PathBuf {
    current_exe.with_extension("exe.new")
}

pub(crate) fn launcher_backup_path(current_exe: &Path) -> PathBuf {
    current_exe.with_extension("exe.old")
}

pub(crate) fn launcher_update_script_path() -> PathBuf {
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    std::env::temp_dir().join(format!(
        "r5r-launcher-update-{}-{}.cmd",
        std::process::id(),
        now
    ))
}

pub(crate) fn write_launcher_update_script(
    script_path: &Path,
    current_exe: &Path,
    downloaded_exe: &Path,
    backup_exe: &Path,
) -> Result<(), String> {
    let script = format!(
        "@echo off\r\n\
setlocal\r\n\
set \"TARGET={target}\"\r\n\
set \"SOURCE={source}\"\r\n\
set \"BACKUP={backup}\"\r\n\
:wait_for_launcher\r\n\
move /Y \"%TARGET%\" \"%BACKUP%\" >nul 2>&1\r\n\
if errorlevel 1 (\r\n\
  timeout /t 1 /nobreak >nul\r\n\
  goto wait_for_launcher\r\n\
)\r\n\
move /Y \"%SOURCE%\" \"%TARGET%\" >nul 2>&1\r\n\
if errorlevel 1 (\r\n\
  move /Y \"%BACKUP%\" \"%TARGET%\" >nul 2>&1\r\n\
  exit /b 1\r\n\
)\r\n\
start \"\" \"%TARGET%\"\r\n\
if exist \"%BACKUP%\" del /f /q \"%BACKUP%\" >nul 2>&1\r\n\
del /f /q \"%~f0\" >nul 2>&1\r\n",
        target = batch_quote(current_exe),
        source = batch_quote(downloaded_exe),
        backup = batch_quote(backup_exe),
    );

    std::fs::write(script_path, script)
        .map_err(|error| format!("Failed to create launcher updater script: {error}"))
}

pub(crate) fn spawn_launcher_update_script(script_path: &Path) -> Result<(), String> {
    Command::new("cmd")
        .creation_flags(CREATE_NO_WINDOW)
        .args(["/C", &script_path.display().to_string()])
        .spawn()
        .map_err(|error| format!("Failed to launch launcher updater: {error}"))?;
    Ok(())
}

fn batch_quote(path: &Path) -> String {
    path.display().to_string().replace('"', "\"\"")
}
