mod launch_args;
mod launcher;
mod constants;
mod download;
mod migration;
mod manifest;
mod mods;
mod models;
mod paths;
mod self_update;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(launcher::GameSyncLock::default())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            launcher::get_legacy_install_state,
            launcher::dismiss_legacy_install_state,
            launcher::get_game_install_state,
            launcher::get_installed_mods_state,
            launcher::get_launcher_update_state,
            launcher::get_optional_content_summary,
            launcher::get_game_runtime_status,
            launcher::get_master_server_status,
            launcher::get_primary_monitor_resolutions,
            launcher::open_game_install_dir,
            launcher::remove_optional_content,
            launcher::set_mod_enabled_state,
            launcher::start_legacy_install_migration_command,
            launcher::start_game_sync,
            launcher::start_optional_content_sync,
            launcher::start_launcher_self_update,
            launcher::launch_game
        ])
        .run(tauri::generate_context!())
        .expect("error while running application");
}
