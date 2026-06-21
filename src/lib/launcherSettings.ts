export type LauncherSettings = {
  soundsEnabled: boolean;
  closeAfterGameStarts: boolean;
  backgroundVideoEnabled: boolean;
  hdTexturesEnabled: boolean;
};

export const DEFAULT_LAUNCHER_SETTINGS: LauncherSettings = {
  soundsEnabled: true,
  closeAfterGameStarts: false,
  backgroundVideoEnabled: true,
  hdTexturesEnabled: false,
};

const STORAGE_KEY = "r5r.launcherSettings";
export const LAUNCHER_SETTINGS_CHANGED_EVENT = "r5r:launcher-settings-changed";

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function loadLauncherSettings(): LauncherSettings {
  if (typeof window === "undefined") {
    return { ...DEFAULT_LAUNCHER_SETTINGS };
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ...DEFAULT_LAUNCHER_SETTINGS };
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed)) {
      return { ...DEFAULT_LAUNCHER_SETTINGS };
    }

    return {
      ...DEFAULT_LAUNCHER_SETTINGS,
      ...parsed,
      soundsEnabled:
        typeof parsed.soundsEnabled === "boolean"
          ? parsed.soundsEnabled
          : DEFAULT_LAUNCHER_SETTINGS.soundsEnabled,
      closeAfterGameStarts:
        typeof parsed.closeAfterGameStarts === "boolean"
          ? parsed.closeAfterGameStarts
          : DEFAULT_LAUNCHER_SETTINGS.closeAfterGameStarts,
      backgroundVideoEnabled:
        typeof parsed.backgroundVideoEnabled === "boolean"
          ? parsed.backgroundVideoEnabled
          : DEFAULT_LAUNCHER_SETTINGS.backgroundVideoEnabled,
      hdTexturesEnabled:
        typeof parsed.hdTexturesEnabled === "boolean"
          ? parsed.hdTexturesEnabled
          : DEFAULT_LAUNCHER_SETTINGS.hdTexturesEnabled,
    };
  } catch {
    return { ...DEFAULT_LAUNCHER_SETTINGS };
  }
}

export function saveLauncherSettings(settings: LauncherSettings) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  window.dispatchEvent(
    new CustomEvent<LauncherSettings>(LAUNCHER_SETTINGS_CHANGED_EVENT, {
      detail: settings,
    }),
  );
}

export function areLauncherSoundsEnabled() {
  return loadLauncherSettings().soundsEnabled;
}
