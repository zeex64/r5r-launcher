import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { getAppError } from "../lib/appError";
import {
  LAUNCH_SETTINGS_CHANGED_EVENT,
  loadLaunchSettings,
  type LaunchSettings,
} from "../lib/launchSettings";
import {
  LAUNCHER_SETTINGS_CHANGED_EVENT,
  loadLauncherSettings,
  saveLauncherSettings,
  type LauncherSettings,
} from "../lib/launcherSettings";
import { playGameLaunch } from "../lib/uiSound";
import type {
  AppError,
  GameInstallState,
  GameRuntimeStatus,
  GameSyncFinished,
  GameSyncProgress,
  LegacyInstallInfo,
  LauncherUpdateState,
  MasterServerStatus,
  OptionalContentSummary,
} from "../types/app";

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = value;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 100 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

export function useLauncherController() {
  const [gameState, setGameState] = useState<GameInstallState | null>(null);
  const [gameProgress, setGameProgress] = useState<GameSyncProgress | null>(null);
  const [gameActionError, setGameActionError] = useState<AppError | null>(null);
  const [gameRuntimeStatus, setGameRuntimeStatus] = useState<GameRuntimeStatus>({
    running: false,
    instanceCount: 0,
  });
  const [launchPending, setLaunchPending] = useState(false);
  const [launcherUpdateState, setLauncherUpdateState] = useState<LauncherUpdateState | null>(null);
  const [launcherUpdateBusy, setLauncherUpdateBusy] = useState(false);
  const [legacyInstallInfo, setLegacyInstallInfo] = useState<LegacyInstallInfo | null>(null);
  const [legacyMigrationBusy, setLegacyMigrationBusy] = useState(false);
  const [currentLaunchSettings, setCurrentLaunchSettings] = useState<LaunchSettings>(() =>
    loadLaunchSettings(),
  );
  const [currentLauncherSettings, setCurrentLauncherSettings] = useState<LauncherSettings>(() =>
    loadLauncherSettings(),
  );
  const [optionalContentPrompt, setOptionalContentPrompt] = useState<{
    mode: "enable" | "disable";
    summary?: OptionalContentSummary | null;
  } | null>(null);
  const [optionalContentBusy, setOptionalContentBusy] = useState(false);
  const [masterServerStatus, setMasterServerStatus] = useState<MasterServerStatus>({
    reachable: false,
    label: "Master Server Checking",
  });
  const [manualVerifyPending, setManualVerifyPending] = useState(false);

  const isDedicatedMode = currentLaunchSettings.launchMode === "SERVER";

  const loadGameState = async () => {
    try {
      const nextState = await invoke<GameInstallState>("get_game_install_state", {
        includeOptional: currentLauncherSettings.hdTexturesEnabled,
      });
      setGameState(nextState);
    } catch (error: unknown) {
      setGameActionError(getAppError(error, "We couldn't check the game install status."));
    }
  };

  const loadLegacyInstallInfo = async () => {
    try {
      const info = await invoke<LegacyInstallInfo | null>("get_legacy_install_state");
      setLegacyInstallInfo(info);
    } catch {
      setLegacyInstallInfo(null);
    }
  };

  const loadMasterServerStatus = async () => {
    try {
      const status = await invoke<MasterServerStatus>("get_master_server_status");
      setMasterServerStatus(status);
    } catch {
      setMasterServerStatus({
        reachable: false,
        label: "Master Server Offline",
      });
    }
  };

  const loadLauncherUpdateState = async () => {
    try {
      const status = await invoke<LauncherUpdateState>("get_launcher_update_state");
      setLauncherUpdateState(status.updateAvailable ? status : null);
    } catch {
      setLauncherUpdateState(null);
    }
  };

  const loadGameRuntimeStatus = async () => {
    try {
      const status = await invoke<GameRuntimeStatus>("get_game_runtime_status");
      setGameRuntimeStatus(status);
      if (status.running) {
        setLaunchPending(false);
      }
    } catch {
      setGameRuntimeStatus({
        running: false,
        instanceCount: 0,
      });
    }
  };

  useEffect(() => {
    void loadLegacyInstallInfo();
    void loadLauncherUpdateState();

    let disposeProgress: (() => void) | undefined;
    let disposeFinished: (() => void) | undefined;

    void listen<GameSyncProgress>("game-sync-progress", (event) => {
      setGameProgress(event.payload);
    }).then((unlisten) => {
      disposeProgress = unlisten;
    });

    void listen<GameSyncFinished>("game-sync-finished", (event) => {
      setGameActionError(event.payload.ok ? null : { message: event.payload.message });
      setManualVerifyPending(false);
      setGameProgress((current) =>
        current && event.payload.ok
          ? { ...current, stage: "complete", message: event.payload.message }
          : current,
      );
      void loadGameState();
      if (event.payload.ok) {
        window.setTimeout(() => {
          setGameProgress((current) => (current?.stage === "complete" ? null : current));
        }, 2500);
      }
    }).then((unlisten) => {
      disposeFinished = unlisten;
    });

    return () => {
      disposeProgress?.();
      disposeFinished?.();
    };
  }, []);

  useEffect(() => {
    void loadGameState();
  }, [currentLauncherSettings.hdTexturesEnabled]);

  useEffect(() => {
    const handleLaunchSettingsChanged = (event: Event) => {
      const detail = (event as CustomEvent<LaunchSettings>).detail;
      setCurrentLaunchSettings(detail ?? loadLaunchSettings());
    };
    const handleLauncherSettingsChanged = (event: Event) => {
      const detail = (event as CustomEvent<LauncherSettings>).detail;
      setCurrentLauncherSettings(detail ?? loadLauncherSettings());
    };

    window.addEventListener(LAUNCH_SETTINGS_CHANGED_EVENT, handleLaunchSettingsChanged);
    window.addEventListener(LAUNCHER_SETTINGS_CHANGED_EVENT, handleLauncherSettingsChanged);

    return () => {
      window.removeEventListener(LAUNCH_SETTINGS_CHANGED_EVENT, handleLaunchSettingsChanged);
      window.removeEventListener(
        LAUNCHER_SETTINGS_CHANGED_EVENT,
        handleLauncherSettingsChanged,
      );
    };
  }, []);

  useEffect(() => {
    if (gameState?.buttonLabel !== "PLAY" || isDedicatedMode) {
      setLaunchPending(false);
      setGameRuntimeStatus({
        running: false,
        instanceCount: 0,
      });
      return;
    }

    void loadGameRuntimeStatus();
    const intervalId = window.setInterval(() => {
      void loadGameRuntimeStatus();
    }, 2_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [gameState?.buttonLabel, isDedicatedMode]);

  useEffect(() => {
    void loadMasterServerStatus();
    const intervalId = window.setInterval(() => {
      void loadMasterServerStatus();
    }, 30_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const handleGameAction = async () => {
    if (
      !gameState ||
      gameState.busy ||
      launchPending ||
      (!isDedicatedMode && gameRuntimeStatus.running)
    ) {
      return;
    }

    try {
      setGameActionError(null);
      setGameProgress(null);
      if (gameState.buttonLabel === "PLAY") {
        setLaunchPending(true);
        await invoke("launch_game", { options: currentLaunchSettings });
        if (currentLauncherSettings.closeAfterGameStarts) {
          await getCurrentWindow().close();
          return;
        }
        if (!isDedicatedMode) {
          window.setTimeout(() => {
            void loadGameRuntimeStatus();
          }, 500);
          window.setTimeout(() => {
            setLaunchPending(false);
            void loadGameRuntimeStatus();
          }, 10_000);
        } else {
          window.setTimeout(() => {
            setLaunchPending(false);
          }, 800);
        }
      } else {
        setManualVerifyPending(false);
        await invoke("start_game_sync", {
          includeOptional: currentLauncherSettings.hdTexturesEnabled,
        });
        setGameProgress((current) =>
          current ?? {
            stage: "preparing",
            currentFile: null,
            message:
              gameState.buttonLabel === "INSTALL"
                ? "Preparing install"
                : "Preparing update",
            downloadedBytes: 0,
            totalBytes: 0,
            filesDone: 0,
            filesTotal: 0,
          },
        );
        void loadGameState();
      }
    } catch (error: unknown) {
      setLaunchPending(false);
      setGameProgress(null);
      setGameActionError(getAppError(error, "We couldn't start that action."));
    }
  };

  const effectiveBusy = Boolean(gameState?.busy);
  const blockingInstallDirError = gameActionError?.code === "INSTALL_DIR_NOT_EMPTY";
  const overlayMessage = gameActionError?.message ?? null;
  const progressPercent =
    gameProgress && gameProgress.totalBytes > 0
      ? Math.min(100, (gameProgress.downloadedBytes / gameProgress.totalBytes) * 100)
      : 0;
  const gameButtonLabel = !gameState
    ? "CHECKING"
    : effectiveBusy
      ? manualVerifyPending
        ? "VERIFYING"
        : gameState.buttonLabel === "UPDATE"
          ? "UPDATING"
          : "INSTALLING"
      : gameState.buttonLabel === "PLAY"
        ? launchPending && (isDedicatedMode || !gameRuntimeStatus.running)
          ? "LAUNCHING"
          : !isDedicatedMode && gameRuntimeStatus.running
            ? "GAME RUNNING"
            : "PLAY"
        : gameState.buttonLabel;
  const gameStatusText =
    gameActionError?.message ||
    gameState?.error ||
    (effectiveBusy
      ? gameProgress?.message
      : gameState?.buttonLabel === "PLAY"
        ? gameState?.statusText
        : gameState?.statusText) ||
    "Checking game files";
  const progressText = gameProgress
    ? gameProgress.totalBytes > 0
      ? `${progressPercent.toFixed(1)}% - ${formatBytes(gameProgress.downloadedBytes)} / ${formatBytes(gameProgress.totalBytes)}`
      : gameProgress.message
    : null;
  const progressFile = gameProgress?.currentFile ?? null;
  const statusColorClass = gameState?.needsUpdate
    ? "bg-[#f1d14d]"
    : gameState?.installed
      ? "bg-online"
      : "bg-red";
  const gameActionDisabled =
    !gameState ||
    effectiveBusy ||
    launchPending ||
    (gameState.buttonLabel === "PLAY" && !isDedicatedMode && gameRuntimeStatus.running);
  const canVerifyGameFiles =
    Boolean(gameState?.installed) &&
    !effectiveBusy &&
    !launchPending &&
    !optionalContentBusy;
  const showLauncherUpdateOverlay =
    Boolean(launcherUpdateState?.updateAvailable) || launcherUpdateBusy;
  const showLegacyInstallOverlay = Boolean(legacyInstallInfo) || legacyMigrationBusy;
  const saveLauncherSettingsState = (settings: LauncherSettings) => {
    saveLauncherSettings(settings);
    setCurrentLauncherSettings(settings);
  };
  const handleVerifyGameFiles = async () => {
    if (!gameState?.installed || effectiveBusy || launchPending || optionalContentBusy) {
      return;
    }

    try {
      setManualVerifyPending(true);
      setGameActionError(null);
      setGameProgress({
        stage: "preparing",
        currentFile: null,
        message: "Preparing verification",
        downloadedBytes: 0,
        totalBytes: 0,
        filesDone: 0,
        filesTotal: 0,
      });
      await invoke("start_game_sync", {
        includeOptional: currentLauncherSettings.hdTexturesEnabled,
      });
      void loadGameState();
    } catch (error: unknown) {
      setManualVerifyPending(false);
      setGameProgress(null);
      setGameActionError(getAppError(error, "We couldn't start game verification."));
    }
  };

  return {
    dismissLegacyInstall: async () => {
      if (!legacyInstallInfo) return;

      try {
        await invoke("dismiss_legacy_install_state", { gameDir: legacyInstallInfo.gameDir });
        setLegacyInstallInfo(null);
      } catch (error: unknown) {
        setGameActionError(getAppError(error, "We couldn't dismiss the existing install prompt."));
      }
    },
    currentLaunchSettings,
    canVerifyGameFiles,
    gameActionDisabled: Boolean(gameActionDisabled),
    gameBusy: effectiveBusy,
    gameButtonLabel,
    gameStatusText,
    handleGameAction,
    handleGameActionMouseDown: () => {
      if (!gameState) return;
      if (
        gameState.buttonLabel === "PLAY" &&
        !effectiveBusy &&
        !launchPending &&
        (isDedicatedMode || !gameRuntimeStatus.running)
      ) {
        playGameLaunch();
      }
    },
    handleLauncherUpdate: async () => {
      if (launcherUpdateBusy) return;

      try {
        setLauncherUpdateBusy(true);
        await invoke("start_launcher_self_update");
      } catch (error: unknown) {
        setLauncherUpdateBusy(false);
        setLauncherUpdateState(null);
        setGameActionError(getAppError(error, "We couldn't update the launcher."));
      }
    },
    handleLegacyInstallMigration: async () => {
      if (!legacyInstallInfo || legacyMigrationBusy) return;

      try {
        setLegacyMigrationBusy(true);
        await invoke("start_legacy_install_migration_command", {
          gameDir: legacyInstallInfo.gameDir,
        });
        await getCurrentWindow().close();
      } catch (error: unknown) {
        setLegacyMigrationBusy(false);
        setGameActionError(getAppError(error, "We couldn't move the launcher into the existing install."));
      }
    },
    handleHdTexturesToggleRequest: async (enabled: boolean) => {
      if (optionalContentBusy || effectiveBusy) return;
      if (enabled === currentLauncherSettings.hdTexturesEnabled) return;

      if (enabled) {
        setOptionalContentPrompt({ mode: "enable", summary: null });
        try {
          const summary = await invoke<OptionalContentSummary>("get_optional_content_summary");
          setOptionalContentPrompt({ mode: "enable", summary });
        } catch (error: unknown) {
          setOptionalContentPrompt(null);
          setGameActionError(getAppError(error, "We couldn't check the HD textures size."));
        }
        return;
      }

      if (!gameState?.installed) {
        saveLauncherSettingsState({ ...currentLauncherSettings, hdTexturesEnabled: false });
        return;
      }

      setOptionalContentPrompt({ mode: "disable", summary: null });
    },
    confirmOptionalContentPrompt: async () => {
      if (!optionalContentPrompt || optionalContentBusy) return;

      try {
        setOptionalContentBusy(true);

        if (optionalContentPrompt.mode === "enable") {
          const nextSettings = { ...currentLauncherSettings, hdTexturesEnabled: true };
          saveLauncherSettingsState(nextSettings);
          setOptionalContentPrompt(null);

          if (gameState?.installed && gameState.buttonLabel === "PLAY" && !gameState.needsUpdate) {
            setGameActionError(null);
            setGameProgress({
              stage: "preparing",
              currentFile: null,
              message: "Preparing HD textures",
              downloadedBytes: 0,
              totalBytes: 0,
              filesDone: 0,
              filesTotal: 0,
            });
            await invoke("start_optional_content_sync");
          }
        } else {
          await invoke("remove_optional_content");
          const nextSettings = { ...currentLauncherSettings, hdTexturesEnabled: false };
          saveLauncherSettingsState(nextSettings);
          setOptionalContentPrompt(null);
          void loadGameState();
        }
      } catch (error: unknown) {
        setGameActionError(
          getAppError(
            error,
            optionalContentPrompt.mode === "enable"
              ? "We couldn't start the HD texture download."
              : "We couldn't remove the HD texture files.",
          ),
        );
      } finally {
        setOptionalContentBusy(false);
      }
    },
    dismissOptionalContentPrompt: () => {
      if (optionalContentBusy) return;
      setOptionalContentPrompt(null);
    },
    handleVerifyGameFiles,
    legacyInstallInfo,
    legacyMigrationBusy,
    launcherUpdateBusy,
    launcherUpdateState,
    masterServerStatus,
    optionalContentBusy,
    optionalContentPrompt,
    overlayMessage,
    progressFile,
    progressPercent,
    progressText,
    currentLauncherSettings,
    setGameActionError,
    setLauncherUpdateState,
    setLegacyInstallInfo,
    showLegacyInstallOverlay,
    showLauncherUpdateOverlay,
    statusColorClass,
    blockingInstallDirError,
  };
}
