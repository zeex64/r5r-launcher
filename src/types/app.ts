export type GameInstallState = {
  installDir: string;
  installed: boolean;
  installedVersion: string | null;
  remoteVersion: string | null;
  buttonLabel: string;
  statusText: string;
  needsUpdate: boolean;
  busy: boolean;
  error: string | null;
};

export type GameSyncProgress = {
  stage: string;
  currentFile: string | null;
  message: string;
  downloadedBytes: number;
  totalBytes: number;
  filesDone: number;
  filesTotal: number;
};

export type GameSyncFinished = {
  ok: boolean;
  message: string;
};

export type MasterServerStatus = {
  reachable: boolean;
  label: string;
};

export type GameRuntimeStatus = {
  running: boolean;
  instanceCount: number;
};

export type LauncherUpdateState = {
  localVersion: string;
  remoteVersion: string | null;
  updateAvailable: boolean;
  statusText: string;
  error: string | null;
};

export type OptionalContentSummary = {
  fileCount: number;
  totalBytes: number;
};

export type LegacyInstallInfo = {
  legacyRoot: string;
  launcherDir: string;
  legacyLauncherExe: string;
  gameDir: string;
  targetExe: string;
  shortcutDir: string;
  shortcutPath: string;
};

export type InstalledModEntry = {
  folderName: string;
  enabled: boolean;
  name: string;
  modId: string;
  description: string;
  version: string;
  author: string;
  hasManifest: boolean;
};

export type InstalledModsState = {
  modsDir: string;
  totalCount: number;
  enabledCount: number;
  items: InstalledModEntry[];
};

export type AppError = {
  code?: string | null;
  message: string;
};
