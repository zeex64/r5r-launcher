use std::sync::atomic::AtomicBool;

use serde::{Deserialize, Serialize};

#[derive(Default)]
pub struct GameSyncLock(pub AtomicBool);

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub(crate) code: Option<String>,
    pub(crate) message: String,
}

impl AppError {
    pub(crate) fn message(message: impl Into<String>) -> Self {
        Self {
            code: None,
            message: message.into(),
        }
    }

    pub(crate) fn coded(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: Some(code.into()),
            message: message.into(),
        }
    }
}

#[derive(Debug, Deserialize)]
pub(crate) struct LauncherConfig {
    pub(crate) game: LauncherGameConfig,
}

#[derive(Debug, Clone, Deserialize)]
pub(crate) struct LauncherBinary {
    pub(crate) version: String,
    pub(crate) url: String,
    pub(crate) checksum: String,
}

#[derive(Debug, Deserialize)]
pub(crate) struct GitHubRelease {
    pub(crate) tag_name: String,
    pub(crate) assets: Vec<GitHubReleaseAsset>,
}

#[derive(Debug, Deserialize)]
pub(crate) struct GitHubReleaseAsset {
    pub(crate) name: String,
    pub(crate) browser_download_url: String,
}

#[derive(Debug, Clone, Deserialize)]
pub(crate) struct LauncherGameConfig {
    pub(crate) base_url: String,
    pub(crate) checksums: String,
    #[serde(rename = "dedicated_zip")]
    pub(crate) _dedicated_zip: String,
}

#[derive(Debug, Clone, Deserialize)]
pub(crate) struct ChecksumsManifest {
    pub(crate) game_version: String,
    pub(crate) files: Vec<ManifestFile>,
}

#[derive(Debug, Clone, Deserialize)]
pub(crate) struct ManifestFile {
    pub(crate) path: String,
    pub(crate) size: u64,
    pub(crate) checksum: String,
    #[serde(default)]
    pub(crate) optional: bool,
    #[serde(default)]
    pub(crate) parts: Vec<ManifestPart>,
}

#[derive(Debug, Clone, Deserialize)]
pub(crate) struct ManifestPart {
    pub(crate) path: String,
    pub(crate) size: u64,
    pub(crate) checksum: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GameInstallState {
    pub(crate) install_dir: String,
    pub(crate) installed: bool,
    pub(crate) installed_version: Option<String>,
    pub(crate) remote_version: Option<String>,
    pub(crate) button_label: String,
    pub(crate) status_text: String,
    pub(crate) needs_update: bool,
    pub(crate) busy: bool,
    pub(crate) error: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GameSyncProgress {
    pub(crate) stage: String,
    pub(crate) current_file: Option<String>,
    pub(crate) message: String,
    pub(crate) downloaded_bytes: u64,
    pub(crate) total_bytes: u64,
    pub(crate) files_done: usize,
    pub(crate) files_total: usize,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub(crate) struct GameSyncFinished {
    pub(crate) ok: bool,
    pub(crate) message: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MasterServerStatus {
    pub(crate) reachable: bool,
    pub(crate) label: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GameRuntimeStatus {
    pub(crate) running: bool,
    pub(crate) instance_count: usize,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LauncherUpdateState {
    pub(crate) local_version: String,
    pub(crate) remote_version: Option<String>,
    pub(crate) update_available: bool,
    pub(crate) status_text: String,
    pub(crate) error: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LegacyInstallInfo {
    pub(crate) legacy_root: String,
    pub(crate) launcher_dir: String,
    pub(crate) legacy_launcher_exe: String,
    pub(crate) game_dir: String,
    pub(crate) target_exe: String,
    pub(crate) shortcut_dir: String,
    pub(crate) shortcut_path: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InstalledModsState {
    pub(crate) mods_dir: String,
    pub(crate) total_count: usize,
    pub(crate) enabled_count: usize,
    pub(crate) items: Vec<InstalledModEntry>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InstalledModEntry {
    pub(crate) folder_name: String,
    pub(crate) enabled: bool,
    pub(crate) name: String,
    pub(crate) mod_id: String,
    pub(crate) description: String,
    pub(crate) version: String,
    pub(crate) author: String,
    pub(crate) has_manifest: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct OptionalContentSummary {
    pub(crate) file_count: usize,
    pub(crate) total_bytes: u64,
}

#[derive(Debug, Clone)]
pub(crate) struct RemoteGame {
    pub(crate) base_url: String,
    pub(crate) manifest: ChecksumsManifest,
}

#[derive(Debug, Clone)]
pub(crate) struct DownloadJob {
    pub(crate) file: ManifestFile,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchOptions {
    pub(crate) launch_mode: String,
    pub(crate) hostname: String,
    pub(crate) hostdesc: String,
    pub(crate) visibility: i32,
    pub(crate) server_password: String,
    pub(crate) hostport: String,
    pub(crate) map: String,
    pub(crate) playlist: String,
    pub(crate) windowed: bool,
    pub(crate) borderless: bool,
    pub(crate) res_w: String,
    pub(crate) res_h: String,
    pub(crate) max_fps: String,
    pub(crate) no_vid: bool,
    pub(crate) show_fps: String,
    pub(crate) reserved_cores: String,
    pub(crate) worker_threads: String,
    pub(crate) no_async: bool,
    pub(crate) encrypt_packets: bool,
    pub(crate) random_netkey: bool,
    pub(crate) queued_packets: bool,
    pub(crate) no_timeout: bool,
    pub(crate) show_debug_info: bool,
    pub(crate) matchmaking_hostname: String,
    pub(crate) show_console: bool,
    pub(crate) color_console: bool,
    pub(crate) show_pos: bool,
    pub(crate) draw_notify: bool,
    pub(crate) playlist_file: String,
    pub(crate) enable_developer: bool,
    pub(crate) enable_cheats: bool,
    pub(crate) offline_mode: bool,
    pub(crate) custom_cmd: String,
}
