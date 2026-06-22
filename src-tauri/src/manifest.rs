use std::time::Duration;

use reqwest::Client;

use crate::{
    constants::{github_latest_release_api_url, github_latest_manifest_url},
    models::{GitHubRelease, LauncherBinary, LauncherConfig, RemoteGame},
};

pub(crate) async fn fetch_remote_game() -> Result<RemoteGame, String> {
    let client = build_http_client()?;
    let config = fetch_launcher_config().await?;
    let manifest = client
        .get(&config.game.checksums)
        .send()
        .await
        .map_err(|error| format!("Failed to fetch game checksums: {error}"))?
        .error_for_status()
        .map_err(|error| format!("Game checksums request failed: {error}"))?
        .json()
        .await
        .map_err(|error| format!("Failed to parse game checksums: {error}"))?;

    Ok(RemoteGame {
        base_url: config.game.base_url,
        manifest,
    })
}

pub(crate) async fn fetch_launcher_config() -> Result<LauncherConfig, String> {
    let client = build_http_client()?;
    client
        .get(github_latest_manifest_url())
        .send()
        .await
        .map_err(|error| format!("Failed to fetch launcher config: {error}"))?
        .error_for_status()
        .map_err(|error| format!("Launcher config request failed: {error}"))?
        .json::<LauncherConfig>()
        .await
        .map_err(|error| format!("Failed to parse launcher config: {error}"))
}

pub(crate) async fn fetch_remote_launcher() -> Result<LauncherBinary, String> {
    let client = build_http_client()?;
    let release = client
        .get(github_latest_release_api_url())
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(|error| format!("Failed to fetch latest GitHub release: {error}"))?
        .error_for_status()
        .map_err(|error| format!("Latest GitHub release request failed: {error}"))?
        .json::<GitHubRelease>()
        .await
        .map_err(|error| format!("Failed to parse latest GitHub release: {error}"))?;

    let expected_exe_name = format!("{}.exe", env!("CARGO_PKG_NAME"));
    let exe_asset = release
        .assets
        .iter()
        .find(|asset| asset.name.eq_ignore_ascii_case(&expected_exe_name))
        .or_else(|| {
            release
                .assets
                .iter()
                .find(|asset| asset.name.to_ascii_lowercase().ends_with(".exe"))
        })
        .ok_or_else(|| "Latest GitHub release did not include a Windows .exe asset.".to_string())?;

    let checksum_asset_name = format!("{}.sha256.txt", exe_asset.name);
    let checksum_asset = release
        .assets
        .iter()
        .find(|asset| asset.name.eq_ignore_ascii_case(&checksum_asset_name))
        .ok_or_else(|| {
            format!(
                "Latest GitHub release did not include checksum asset {}.",
                checksum_asset_name
            )
        })?;

    let checksum_text = client
        .get(&checksum_asset.browser_download_url)
        .send()
        .await
        .map_err(|error| format!("Failed to fetch launcher checksum: {error}"))?
        .error_for_status()
        .map_err(|error| format!("Launcher checksum request failed: {error}"))?
        .text()
        .await
        .map_err(|error| format!("Failed to read launcher checksum: {error}"))?;

    let checksum = checksum_text
        .split_whitespace()
        .next()
        .filter(|value| !value.is_empty())
        .ok_or_else(|| "Launcher checksum asset was empty.".to_string())?;

    Ok(LauncherBinary {
        version: release.tag_name,
        url: exe_asset.browser_download_url.clone(),
        checksum: checksum.to_string(),
    })
}

pub(crate) fn build_http_client() -> Result<Client, String> {
    Client::builder()
        .connect_timeout(Duration::from_secs(15))
        .tcp_keepalive(Duration::from_secs(30))
        .user_agent("R5ReloadedLauncher/0.1")
        .build()
        .map_err(|error| format!("Failed to create HTTP client: {error}"))
}

pub(crate) async fn is_master_server_reachable(client: &Client, url: &str) -> bool {
    client
        .get(url)
        .send()
        .await
        .map(|response| response.status().is_success() || response.status().is_redirection())
        .unwrap_or(false)
}
