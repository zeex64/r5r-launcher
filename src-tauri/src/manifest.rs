use std::time::Duration;

use reqwest::Client;

use crate::{
    constants::CONFIG_URL,
    models::{LauncherBinary, LauncherConfig, RemoteGame},
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
        .get(CONFIG_URL)
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
    fetch_launcher_config()
        .await?
        .launcher
        .ok_or_else(|| "Launcher manifest did not include launcher metadata.".to_string())
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
