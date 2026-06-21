export type LaunchMode = "CLIENT" | "HOST" | "SERVER";

export type LaunchSettings = {
  launchMode: LaunchMode;
  hostname: string;
  hostdesc: string;
  visibility: number;
  serverPassword: string;
  hostport: string;
  map: string;
  playlist: string;
  windowed: boolean;
  borderless: boolean;
  resW: string;
  resH: string;
  maxFps: string;
  noVid: boolean;
  showFps: string;
  reservedCores: string;
  workerThreads: string;
  noAsync: boolean;
  encryptPackets: boolean;
  randomNetkey: boolean;
  queuedPackets: boolean;
  noTimeout: boolean;
  showDebugInfo: boolean;
  matchmakingHostname: string;
  showConsole: boolean;
  colorConsole: boolean;
  showPos: boolean;
  drawNotify: boolean;
  playlistFile: string;
  enableDeveloper: boolean;
  enableCheats: boolean;
  offlineMode: boolean;
  customCmd: string;
};

export const DEFAULT_LAUNCH_SETTINGS: LaunchSettings = {
  launchMode: "HOST",
  hostname: "",
  hostdesc: "",
  visibility: 2,
  serverPassword: "",
  hostport: "37015",
  map: "",
  playlist: "",
  windowed: false,
  borderless: false,
  resW: "1920",
  resH: "1080",
  maxFps: "0",
  noVid: true,
  showFps: "0",
  reservedCores: "-1",
  workerThreads: "-1",
  noAsync: false,
  encryptPackets: true,
  randomNetkey: true,
  queuedPackets: false,
  noTimeout: false,
  showDebugInfo: false,
  matchmakingHostname: "",
  showConsole: false,
  colorConsole: true,
  showPos: false,
  drawNotify: false,
  playlistFile: "",
  enableDeveloper: false,
  enableCheats: false,
  offlineMode: false,
  customCmd: "",
};

const STORAGE_KEY = "r5r.launchSettings";
export const LAUNCH_SETTINGS_CHANGED_EVENT = "r5r:launch-settings-changed";
const VALID_LAUNCH_MODES: LaunchMode[] = ["CLIENT", "HOST", "SERVER"];

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function loadLaunchSettings(): LaunchSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_LAUNCH_SETTINGS };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_LAUNCH_SETTINGS };
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed)) {
      return { ...DEFAULT_LAUNCH_SETTINGS };
    }

    return {
      ...DEFAULT_LAUNCH_SETTINGS,
      ...parsed,
      launchMode: VALID_LAUNCH_MODES.includes(parsed.launchMode as LaunchMode)
        ? (parsed.launchMode as LaunchMode)
        : DEFAULT_LAUNCH_SETTINGS.launchMode,
      visibility: Number(parsed.visibility ?? DEFAULT_LAUNCH_SETTINGS.visibility),
    };
  } catch {
    return { ...DEFAULT_LAUNCH_SETTINGS };
  }
}

export function saveLaunchSettings(settings: LaunchSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(
    new CustomEvent<LaunchSettings>(LAUNCH_SETTINGS_CHANGED_EVENT, {
      detail: settings,
    }),
  );
}

function isWholeNumber(value: string) {
  return /^-?\d+$/.test(value);
}

function isPositiveNumber(value: string) {
  return /^\d+$/.test(value);
}

export function buildLaunchArgumentsPreview(settings: LaunchSettings) {
  const args: string[] = [];
  const mode = settings.launchMode;

  if (settings.reservedCores) args.push(`-numreservedcores ${settings.reservedCores}`);
  if (settings.workerThreads) args.push(`-numworkerthreads ${settings.workerThreads}`);
  args.push(settings.encryptPackets ? "+net_encryptionEnable 1" : "+net_encryptionEnable 0");
  args.push(settings.randomNetkey ? "+net_useRandomKey 1" : "+net_useRandomKey 0");
  args.push(settings.queuedPackets ? "+net_queued_packet_thread 1" : "+net_queued_packet_thread 0");
  if (settings.noTimeout) args.push("-notimeout");

  args.push(settings.showConsole || mode === "SERVER" ? "-wconsole" : "-noconsole");
  if (settings.colorConsole) args.push("-ansicolor");
  if (settings.playlistFile) args.push(`-playlistfile "${settings.playlistFile}"`);
  if (settings.enableDeveloper) args.push("-dev -devsdk");
  if (settings.enableCheats) args.push("+sv_cheats 1");
  if (settings.offlineMode) args.push("-offline");

  if (settings.noVid) args.push("-novid");
  if (settings.showFps && settings.showFps !== "0") args.push(`+cl_showfps ${settings.showFps}`);
  if (settings.showPos) args.push("+cl_showpos 1");
  if (settings.showDebugInfo) args.push("+pylon_showdebuginfo 1");
  if (
    settings.matchmakingHostname &&
    settings.matchmakingHostname !== "r5r.org"
  ) {
    args.push(`+pylon_matchmaking_hostname "${settings.matchmakingHostname}"`);
  }
  if (settings.drawNotify) args.push("+con_drawnotify 1");

  if (mode === "SERVER") {
    if (settings.hostname) args.push(`+hostname "${settings.hostname}"`);
    if (settings.hostdesc) args.push(`+sv_serverbrowserdescription "${settings.hostdesc}"`);
    args.push(`+pylon_host_visibility ${settings.visibility}`);
    if (settings.serverPassword) args.push(`+sv_password "${settings.serverPassword}"`);
    if (settings.hostport && isPositiveNumber(settings.hostport)) {
      args.push(`+hostport ${settings.hostport}`);
    }
    if (settings.map) args.push(`+map ${settings.map}`);
    if (settings.playlist) args.push(`+launchplaylist ${settings.playlist}`);
  }

  args.push(settings.windowed ? "-windowed" : "-fullscreen");
  args.push(settings.borderless ? "-noborder" : "-forceborder");
  if (settings.maxFps && isWholeNumber(settings.maxFps)) args.push(`+fps_max ${settings.maxFps}`);
  if (isPositiveNumber(settings.resW)) args.push(`-w ${settings.resW}`);
  if (isPositiveNumber(settings.resH)) args.push(`-h ${settings.resH}`);

  if (mode === "CLIENT") args.push("-noserverdll");
  if (settings.noAsync) {
    args.push("-noasync");
    args.push(
      "+async_serialize 0 +sv_asyncAIInit 0 +sv_asyncSendSnapshot 0 +sv_scriptCompileAsync 0 +physics_async_sv 0",
    );
    if (mode !== "SERVER") {
      args.push(
        "+buildcubemaps_async 0 +cl_scriptCompileAsync 0 +cl_async_bone_setup 0 +cl_updatedirty_async 0 +mat_syncGPU 1 +mat_sync_rt 1 +mat_sync_rt_flushes_gpu 1 +net_async_sendto 0 +physics_async_cl 0",
      );
    }
  }

  if (settings.customCmd.trim()) {
    args.push(settings.customCmd.trim());
  }

  return args.join(" ").trim();
}
