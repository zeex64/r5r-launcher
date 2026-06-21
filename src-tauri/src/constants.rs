pub const DOWNLOAD_EVENT: &str = "game-sync-progress";
pub const FINISHED_EVENT: &str = "game-sync-finished";
pub const DIR_NOT_EMPTY: &str = "INSTALL_DIR_NOT_EMPTY";
pub const CHUNK_TIMEOUT_SECS: u64 = 30;
pub const CREATE_NO_WINDOW: u32 = 0x08000000;

pub const MASTER_SERVER_HOSTNAME: &str = "r5r.org";
pub const VERSION_FILE_NAME: &str = "r5r_version.txt";
pub const CONFIG_URL: &str = "https://share.zeex64.com/raw/OjRmuK.json";
pub const GAME_EXE_NAME: &str = "r5apex.exe";
pub const GAME_DETECTION_PATHS: &[&str] = &[
    GAME_EXE_NAME,
    "gameinfo.txt",
    "mileswin64.dll",
    "bink2w64.dll",
    "binkawin64.dll",
    "platform/playlists_r5_patch.txt",
];

pub fn master_server_url(scheme: &str) -> String {
    format!("{scheme}://{MASTER_SERVER_HOSTNAME}/")
}
