use crate::{
    constants::MASTER_SERVER_HOSTNAME,
    models::LaunchOptions,
};

pub(crate) fn build_launch_args(options: &LaunchOptions) -> Result<Vec<String>, String> {
    let mut args = Vec::new();
    let mode = options.launch_mode.as_str();

    if !options.reserved_cores.trim().is_empty() {
        push_pair(&mut args, "-numreservedcores", &options.reserved_cores);
    }
    if !options.worker_threads.trim().is_empty() {
        push_pair(&mut args, "-numworkerthreads", &options.worker_threads);
    }

    push_pair(
        &mut args,
        "+net_encryptionEnable",
        if options.encrypt_packets { "1" } else { "0" },
    );
    push_pair(
        &mut args,
        "+net_useRandomKey",
        if options.random_netkey { "1" } else { "0" },
    );
    push_pair(
        &mut args,
        "+net_queued_packet_thread",
        if options.queued_packets { "1" } else { "0" },
    );

    if options.no_timeout {
        args.push("-notimeout".into());
    }

    args.push(
        if options.show_console || mode == "SERVER" {
            "-wconsole"
        } else {
            "-noconsole"
        }
        .into(),
    );

    if options.color_console {
        args.push("-ansicolor".into());
    }
    if !options.playlist_file.trim().is_empty() {
        push_pair(&mut args, "-playlistfile", &options.playlist_file);
    }
    if options.enable_developer {
        args.push("-dev".into());
        args.push("-devsdk".into());
    }
    if options.enable_cheats {
        push_pair(&mut args, "+sv_cheats", "1");
    }
    if options.offline_mode {
        args.push("-offline".into());
    }
    if options.no_vid {
        args.push("-novid".into());
    }
    if options.show_fps != "0" && !options.show_fps.trim().is_empty() {
        push_pair(&mut args, "+cl_showfps", &options.show_fps);
    }
    if options.show_pos {
        push_pair(&mut args, "+cl_showpos", "1");
    }
    if options.show_debug_info {
        push_pair(&mut args, "+pylon_showdebuginfo", "1");
    }
    if !options.matchmaking_hostname.trim().is_empty()
        && options.matchmaking_hostname != MASTER_SERVER_HOSTNAME
    {
        push_pair(
            &mut args,
            "+pylon_matchmaking_hostname",
            &options.matchmaking_hostname,
        );
    }
    if options.draw_notify {
        push_pair(&mut args, "+con_drawnotify", "1");
    }

    if mode == "SERVER" {
        if !options.hostname.trim().is_empty() {
            push_pair(&mut args, "+hostname", &options.hostname);
        }
        if !options.hostdesc.trim().is_empty() {
            push_pair(
                &mut args,
                "+sv_serverbrowserdescription",
                &options.hostdesc,
            );
        }
        push_pair(
            &mut args,
            "+pylon_host_visibility",
            options.visibility.to_string(),
        );
        if !options.server_password.trim().is_empty() {
            push_pair(&mut args, "+sv_password", &options.server_password);
        }
        if is_unsigned_integer(&options.hostport) {
            push_pair(&mut args, "+hostport", &options.hostport);
        }
        if !options.map.trim().is_empty() {
            push_pair(&mut args, "+map", &options.map);
        }
        if !options.playlist.trim().is_empty() {
            push_pair(&mut args, "+launchplaylist", &options.playlist);
        }
    }

    args.push(if options.windowed { "-windowed" } else { "-fullscreen" }.into());
    args.push(if options.borderless { "-noborder" } else { "-forceborder" }.into());

    if is_integer(&options.max_fps) {
        push_pair(&mut args, "+fps_max", &options.max_fps);
    }
    if is_unsigned_integer(&options.res_w) {
        push_pair(&mut args, "-w", &options.res_w);
    }
    if is_unsigned_integer(&options.res_h) {
        push_pair(&mut args, "-h", &options.res_h);
    }

    if mode == "CLIENT" {
        args.push("-noserverdll".into());
    }

    if options.no_async {
        args.push("-noasync".into());
        push_pair(&mut args, "+async_serialize", "0");
        push_pair(&mut args, "+sv_asyncAIInit", "0");
        push_pair(&mut args, "+sv_asyncSendSnapshot", "0");
        push_pair(&mut args, "+sv_scriptCompileAsync", "0");
        push_pair(&mut args, "+physics_async_sv", "0");

        if mode != "SERVER" {
            push_pair(&mut args, "+buildcubemaps_async", "0");
            push_pair(&mut args, "+cl_scriptCompileAsync", "0");
            push_pair(&mut args, "+cl_async_bone_setup", "0");
            push_pair(&mut args, "+cl_updatedirty_async", "0");
            push_pair(&mut args, "+mat_syncGPU", "1");
            push_pair(&mut args, "+mat_sync_rt", "1");
            push_pair(&mut args, "+mat_sync_rt_flushes_gpu", "1");
            push_pair(&mut args, "+net_async_sendto", "0");
            push_pair(&mut args, "+physics_async_cl", "0");
        }
    }

    if !options.custom_cmd.trim().is_empty() {
        let custom_args = shlex::split(&options.custom_cmd)
            .ok_or_else(|| "Custom launch arguments contain invalid quotes. Please fix them and try again.".to_string())?;
        args.extend(custom_args);
    }

    Ok(args)
}

fn push_pair<S: Into<String>, T: Into<String>>(args: &mut Vec<String>, key: S, value: T) {
    args.push(key.into());
    args.push(value.into());
}

fn is_integer(value: &str) -> bool {
    !value.is_empty() && value.parse::<i32>().is_ok()
}

fn is_unsigned_integer(value: &str) -> bool {
    !value.is_empty() && value.parse::<u32>().is_ok()
}
