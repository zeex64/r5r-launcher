use std::path::{Component, Path, PathBuf};

use tokio::fs;

use crate::constants::{
    DIR_NOT_EMPTY, GAME_DETECTION_PATHS,
};
use crate::models::AppError;

pub(crate) fn get_install_dir() -> Result<PathBuf, String> {
    let current_exe =
        std::env::current_exe().map_err(|error| format!("Failed to locate launcher: {error}"))?;
    current_exe
        .parent()
        .map(Path::to_path_buf)
        .ok_or_else(|| "Failed to resolve the launcher's install directory.".into())
}

pub(crate) fn validate_fresh_install_directory() -> Result<(), AppError> {
    let install_dir = get_install_dir().map_err(AppError::message)?;
    if has_existing_game_files(&install_dir) {
        return Ok(());
    }

    if is_downloads_directory(&install_dir) {
        return Err(AppError::coded(
            DIR_NOT_EMPTY,
            "Game requires an empty folder for a new install. Please close the launcher, move it out of Downloads into its own empty folder, and try again.",
        ));
    }

    if is_drive_root(&install_dir) {
        return Err(AppError::coded(
            DIR_NOT_EMPTY,
            "Game requires an empty folder for a new install. Please close the launcher, move it out of the drive root into its own empty folder, and try again.",
        ));
    }

    let current_exe =
        std::env::current_exe().map_err(|error| AppError::message(format!("Failed to locate launcher: {error}")))?;
    let launcher_name = current_exe
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| AppError::message("Failed to resolve the launcher filename."))?;

    let mut has_extra_entries = false;
    let entries = std::fs::read_dir(&install_dir)
        .map_err(|error| AppError::message(format!("Failed to inspect {}: {error}", install_dir.display())))?;

    for entry in entries {
        let entry = entry.map_err(|error| AppError::message(format!(
                "Failed to inspect install directory entry in {}: {error}",
                install_dir.display()
            )))?;
        let file_name = entry.file_name();
        if file_name.to_string_lossy().eq_ignore_ascii_case(launcher_name) {
            continue;
        }
        has_extra_entries = true;
        break;
    }

    if has_extra_entries {
        return Err(AppError::coded(
            DIR_NOT_EMPTY,
            "This folder already contains other files. Game requires its own empty folder for a new install. Please close the launcher, move it into a new empty folder, and try again.",
        ));
    }

    Ok(())
}

pub(crate) fn has_existing_game_files(install_dir: &Path) -> bool {
    GAME_DETECTION_PATHS
        .iter()
        .any(|path| manifest_path_to_fs(install_dir, path).exists())
}

pub(crate) fn manifest_path_to_fs(root: &Path, manifest_path: &str) -> PathBuf {
    let mut path = root.to_path_buf();
    for segment in manifest_path.split(['\\', '/']) {
        if !segment.is_empty() {
            path.push(segment);
        }
    }
    path
}

pub(crate) fn manifest_path_to_url(base_url: &str, manifest_path: &str) -> String {
    format!(
        "{}/{}",
        base_url.trim_end_matches('/'),
        manifest_path.replace('\\', "/")
    )
}

pub(crate) fn temp_download_path(target: &Path) -> PathBuf {
    let mut temp = target.to_path_buf();
    let extension = target
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| format!("{value}.download"))
        .unwrap_or_else(|| "download".into());
    temp.set_extension(extension);
    temp
}

pub(crate) fn part_cache_path(target: &Path, part_index: usize) -> PathBuf {
    PathBuf::from(format!("{}.r5rpart{part_index}", target.display()))
}

pub(crate) fn read_version_file(path: &Path) -> Result<String, String> {
    std::fs::read_to_string(path)
        .map(|contents| contents.trim().to_string())
        .map_err(|error| format!("Failed to read {}: {error}", path.display()))
}

pub(crate) async fn write_version_file(path: &Path, version: &str) -> Result<(), String> {
    fs::write(path, version)
        .await
        .map_err(|error| format!("Failed to write {}: {error}", path.display()))
}

pub(crate) async fn replace_file(from: &Path, to: &Path) -> Result<(), String> {
    if to.exists() {
        fs::remove_file(to)
            .await
            .map_err(|error| format!("Failed to replace {}: {error}", to.display()))?;
    }

    fs::rename(from, to)
        .await
        .map_err(|error| format!("Failed to finalize {}: {error}", to.display()))
}

fn is_downloads_directory(path: &Path) -> bool {
    path.file_name()
        .and_then(|value| value.to_str())
        .is_some_and(|value| value.eq_ignore_ascii_case("Downloads"))
}

fn is_drive_root(path: &Path) -> bool {
    let mut saw_root = false;

    for component in path.components() {
        match component {
            Component::Prefix(_) | Component::RootDir => saw_root = true,
            _ => return false,
        }
    }

    saw_root
}
