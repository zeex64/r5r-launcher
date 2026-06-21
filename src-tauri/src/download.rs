use std::{
    fs::File,
    io::{BufReader, Read, Write},
    path::{Path, PathBuf},
    time::Duration,
};

use futures_util::StreamExt;
use reqwest::Client;
use sha2::{Digest, Sha256};
use tauri::{AppHandle, Emitter};
use tokio::{fs, io::AsyncWriteExt, time::timeout};

use crate::{
    constants::{CHUNK_TIMEOUT_SECS, DOWNLOAD_EVENT},
    models::{GameSyncProgress, ManifestFile},
    paths::{
        manifest_path_to_fs, manifest_path_to_url, part_cache_path, replace_file,
        temp_download_path,
    },
};

pub(crate) async fn file_matches(root: &Path, file: &ManifestFile) -> Result<bool, String> {
    let path = manifest_path_to_fs(root, &file.path);
    if !path.exists() {
        return Ok(false);
    }

    let checksum = compute_sha256(&path).await?;
    Ok(checksum.eq_ignore_ascii_case(&file.checksum))
}

pub(crate) async fn download_single_file(
    app: &AppHandle,
    client: &Client,
    base_url: &str,
    install_dir: &Path,
    file: &ManifestFile,
    mut downloaded_bytes: u64,
    total_bytes: u64,
    file_index: usize,
    file_total: usize,
) -> Result<u64, String> {
    let target_path = manifest_path_to_fs(install_dir, &file.path);
    if file.size == 0 {
        write_empty_file(
            app,
            &target_path,
            &file.path,
            &file.checksum,
            total_bytes,
            file_index,
            file_total,
        )
        .await?;
        return Ok(downloaded_bytes);
    }

    let url = manifest_path_to_url(base_url, &file.path);

    download_with_retries(
        app,
        client,
        &url,
        &target_path,
        &file.checksum,
        &file.path,
        &mut downloaded_bytes,
        total_bytes,
        file_index,
        file_total,
    )
    .await?;

    Ok(downloaded_bytes)
}

pub(crate) async fn download_file_with_retries(
    client: &Client,
    url: &str,
    target_path: &Path,
    expected_checksum: &str,
    label: &str,
) -> Result<(), String> {
    let mut attempt = 1_u32;
    loop {
        match download_file_once(client, url, target_path, expected_checksum).await {
            Ok(()) => return Ok(()),
            Err(error) => {
                if attempt >= 3 {
                    let _ = fs::remove_file(temp_download_path(target_path)).await;
                    return Err(format!("Failed to download {label}: {error}"));
                }
                attempt += 1;
            }
        }
    }
}

pub(crate) async fn download_multipart_file(
    app: &AppHandle,
    client: &Client,
    base_url: &str,
    install_dir: &Path,
    file: &ManifestFile,
    mut downloaded_bytes: u64,
    total_bytes: u64,
    file_index: usize,
    file_total: usize,
) -> Result<u64, String> {
    let target_path = manifest_path_to_fs(install_dir, &file.path);
    if file.size == 0 {
        write_empty_file(
            app,
            &target_path,
            &file.path,
            &file.checksum,
            total_bytes,
            file_index,
            file_total,
        )
        .await?;
        return Ok(downloaded_bytes);
    }

    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent)
            .await
            .map_err(|error| format!("Failed to create {}: {error}", parent.display()))?;
    }

    let mut part_paths = Vec::new();
    for (part_index, part) in file.parts.iter().enumerate() {
        let cached_part = part_cache_path(&target_path, part_index);
        if cached_part.exists() {
            let checksum = compute_sha256(&cached_part).await?;
            if checksum.eq_ignore_ascii_case(&part.checksum) {
                part_paths.push(cached_part);
                continue;
            }
            let _ = fs::remove_file(&cached_part).await;
        }

        let url = manifest_path_to_url(base_url, &part.path);
        download_with_retries(
            app,
            client,
            &url,
            &cached_part,
            &part.checksum,
            &file.path,
            &mut downloaded_bytes,
            total_bytes,
            file_index,
            file_total,
        )
        .await?;
        part_paths.push(cached_part);
    }

    let merged_path = temp_download_path(&target_path);
    emit_progress(
        app,
        GameSyncProgress {
            stage: "merging".into(),
            current_file: Some(file.path.clone()),
            message: format!("Merging {}", file.path),
            downloaded_bytes,
            total_bytes,
            files_done: file_index,
            files_total: file_total,
        },
    );
    merge_parts(&merged_path, &part_paths).await?;

    emit_progress(
        app,
        GameSyncProgress {
            stage: "verifying".into(),
            current_file: Some(file.path.clone()),
            message: format!("Verifying {}", file.path),
            downloaded_bytes,
            total_bytes,
            files_done: file_index,
            files_total: file_total,
        },
    );
    let merged_checksum = compute_sha256(&merged_path).await?;
    if !merged_checksum.eq_ignore_ascii_case(&file.checksum) {
        let _ = fs::remove_file(&merged_path).await;
        return Err(format!(
            "Merged file checksum did not match for {}.",
            file.path
        ));
    }

    replace_file(&merged_path, &target_path).await?;

    for part_path in part_paths {
        let _ = fs::remove_file(part_path).await;
    }

    Ok(downloaded_bytes)
}

pub(crate) async fn compute_sha256(path: &Path) -> Result<String, String> {
    let path = path.to_path_buf();
    tokio::task::spawn_blocking(move || {
        let file = File::open(&path)
            .map_err(|error| format!("Failed to open {}: {error}", path.display()))?;
        let mut reader = BufReader::new(file);
        let mut hasher = Sha256::new();
        let mut buffer = [0_u8; 1024 * 1024];

        loop {
            let read = reader
                .read(&mut buffer)
                .map_err(|error| format!("Failed to read {}: {error}", path.display()))?;
            if read == 0 {
                break;
            }
            hasher.update(&buffer[..read]);
        }

        Ok::<_, String>(format!("{:x}", hasher.finalize()))
    })
    .await
    .map_err(|error| format!("Checksum worker failed: {error}"))?
}

async fn download_with_retries(
    app: &AppHandle,
    client: &Client,
    url: &str,
    target_path: &Path,
    expected_checksum: &str,
    display_path: &str,
    downloaded_bytes: &mut u64,
    total_bytes: u64,
    file_index: usize,
    file_total: usize,
) -> Result<(), String> {
    let mut attempt = 1_u32;
    loop {
        match download_once(
            app,
            client,
            url,
            target_path,
            expected_checksum,
            display_path,
            downloaded_bytes,
            total_bytes,
            file_index,
            file_total,
        )
        .await
        {
            Ok(()) => return Ok(()),
            Err(error) => {
                emit_progress(
                    app,
                    GameSyncProgress {
                        stage: "retrying".into(),
                        current_file: Some(display_path.into()),
                        message: format!("Retrying {} (attempt {})", display_path, attempt + 1),
                        downloaded_bytes: *downloaded_bytes,
                        total_bytes,
                        files_done: file_index,
                        files_total: file_total,
                    },
                );

                attempt += 1;
                let delay_secs = u64::from(attempt.min(10));
                tokio::time::sleep(Duration::from_secs(delay_secs)).await;
                let _ = fs::remove_file(temp_download_path(target_path)).await;

                if attempt == u32::MAX {
                    return Err(error);
                }
            }
        }
    }
}

async fn download_once(
    app: &AppHandle,
    client: &Client,
    url: &str,
    target_path: &Path,
    expected_checksum: &str,
    display_path: &str,
    downloaded_bytes: &mut u64,
    total_bytes: u64,
    file_index: usize,
    file_total: usize,
) -> Result<(), String> {
    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent)
            .await
            .map_err(|error| format!("Failed to create {}: {error}", parent.display()))?;
    }

    let temp_path = temp_download_path(target_path);
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|error| format!("Failed to download {display_path}: {error}"))?
        .error_for_status()
        .map_err(|error| format!("Download request failed for {display_path}: {error}"))?;

    let mut stream = response.bytes_stream();
    let mut file = fs::File::create(&temp_path)
        .await
        .map_err(|error| format!("Failed to create {}: {error}", temp_path.display()))?;

    let base_downloaded = *downloaded_bytes;
    let mut file_downloaded = 0_u64;

    loop {
        let next_chunk = timeout(Duration::from_secs(CHUNK_TIMEOUT_SECS), stream.next())
            .await
            .map_err(|_| format!("Download stalled for {display_path}."))?;

        match next_chunk {
            Some(Ok(chunk)) => {
                file.write_all(&chunk)
                    .await
                    .map_err(|error| format!("Failed to write {display_path}: {error}"))?;
                file_downloaded += chunk.len() as u64;

                emit_progress(
                    app,
                    GameSyncProgress {
                        stage: "downloading".into(),
                        current_file: Some(display_path.into()),
                        message: format!("Downloading {}", display_path),
                        downloaded_bytes: base_downloaded + file_downloaded,
                        total_bytes,
                        files_done: file_index,
                        files_total: file_total,
                    },
                );
            }
            Some(Err(error)) => {
                return Err(format!("Download stream failed for {display_path}: {error}"));
            }
            None => break,
        }
    }

    file.flush()
        .await
        .map_err(|error| format!("Failed to flush {display_path}: {error}"))?;

    let checksum = compute_sha256(&temp_path).await?;
    if !checksum.eq_ignore_ascii_case(expected_checksum) {
        let _ = fs::remove_file(&temp_path).await;
        return Err(format!("Checksum mismatch for {display_path}."));
    }

    replace_file(&temp_path, target_path).await?;
    *downloaded_bytes = base_downloaded + file_downloaded;

    Ok(())
}

async fn download_file_once(
    client: &Client,
    url: &str,
    target_path: &Path,
    expected_checksum: &str,
) -> Result<(), String> {
    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent)
            .await
            .map_err(|error| format!("Failed to create {}: {error}", parent.display()))?;
    }

    let temp_path = temp_download_path(target_path);
    let response = client
        .get(url)
        .send()
        .await
        .map_err(|error| format!("Request failed: {error}"))?
        .error_for_status()
        .map_err(|error| format!("Download failed: {error}"))?;
    let mut stream = response.bytes_stream();
    let mut file = fs::File::create(&temp_path)
        .await
        .map_err(|error| format!("Failed to create {}: {error}", temp_path.display()))?;

    while let Some(chunk) = timeout(Duration::from_secs(CHUNK_TIMEOUT_SECS), stream.next())
        .await
        .map_err(|_| format!("Download stalled for {}.", target_path.display()))?
    {
        let bytes = chunk.map_err(|error| format!("Download stream failed: {error}"))?;
        file.write_all(&bytes)
            .await
            .map_err(|error| format!("Failed to write {}: {error}", temp_path.display()))?;
    }

    file.flush()
        .await
        .map_err(|error| format!("Failed to flush {}: {error}", temp_path.display()))?;

    let checksum = compute_sha256(&temp_path).await?;
    if !checksum.eq_ignore_ascii_case(expected_checksum) {
        let _ = fs::remove_file(&temp_path).await;
        return Err(format!("Checksum mismatch for {}.", target_path.display()));
    }

    replace_file(&temp_path, target_path).await
}

async fn merge_parts(target_path: &Path, part_paths: &[PathBuf]) -> Result<(), String> {
    let target_path = target_path.to_path_buf();
    let parts = part_paths.to_vec();

    tokio::task::spawn_blocking(move || {
        let mut output = File::create(&target_path)
            .map_err(|error| format!("Failed to create {}: {error}", target_path.display()))?;

        for part_path in parts {
            let mut input = File::open(&part_path)
                .map_err(|error| format!("Failed to open {}: {error}", part_path.display()))?;
            let mut buffer = [0_u8; 1024 * 1024];

            loop {
                let read = input
                    .read(&mut buffer)
                    .map_err(|error| format!("Failed to read {}: {error}", part_path.display()))?;
                if read == 0 {
                    break;
                }
                output
                    .write_all(&buffer[..read])
                    .map_err(|error| format!("Failed to merge {}: {error}", part_path.display()))?;
            }
        }

        output
            .flush()
            .map_err(|error| format!("Failed to flush {}: {error}", target_path.display()))?;

        Ok::<_, String>(())
    })
    .await
    .map_err(|error| format!("Merge worker failed: {error}"))?
}

async fn write_empty_file(
    app: &AppHandle,
    target_path: &Path,
    display_path: &str,
    expected_checksum: &str,
    total_bytes: u64,
    file_index: usize,
    file_total: usize,
) -> Result<(), String> {
    if !expected_checksum.eq_ignore_ascii_case("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855") {
        return Err(format!(
            "Zero-byte file {} did not use the expected empty checksum.",
            display_path
        ));
    }

    if let Some(parent) = target_path.parent() {
        fs::create_dir_all(parent)
            .await
            .map_err(|error| format!("Failed to create {}: {error}", parent.display()))?;
    }

    emit_progress(
        app,
        GameSyncProgress {
            stage: "writing".into(),
            current_file: Some(display_path.into()),
            message: format!("Writing {}", display_path),
            downloaded_bytes: 0,
            total_bytes,
            files_done: file_index,
            files_total: file_total,
        },
    );

    fs::write(target_path, [])
        .await
        .map_err(|error| format!("Failed to write empty file {}: {error}", target_path.display()))?;

    Ok(())
}

fn emit_progress(app: &AppHandle, progress: GameSyncProgress) {
    let _ = app.emit(DOWNLOAD_EVENT, progress);
}
