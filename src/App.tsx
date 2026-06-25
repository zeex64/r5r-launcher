import { useEffect, useState } from "react";
import TopNav, { type NavId, type SettingsNavId } from "./components/layout/TopNav";
import HeroBackdrop from "./components/layout/HeroBackdrop";
import ModsView from "./components/mods/ModsView";
import NewsView from "./components/news/NewsView";
import PlayView from "./components/play/PlayView";
import ServersView from "./components/servers/ServersView";
import SettingsView from "./components/settings/SettingsView";
import PopupOverlay from "./components/ui/overlays/PopupOverlay";
import { useLauncherController } from "./hooks/useLauncherController";
import { useModsData } from "./hooks/useModsData";
import { useNewsFeed } from "./hooks/useNewsFeed";
import { useServerBrowserData } from "./hooks/useServerBrowserData";
import { useWindowState } from "./hooks/useWindowState";
import { playSettingsClick } from "./lib/uiSound";

export default function App() {
  useWindowState();

  const [active, setActive] = useState<NavId>("play");
  const [settingsSection, setSettingsSection] = useState<SettingsNavId>("game");
  const { newsPosts, newsLoading, newsError } = useNewsFeed();
  const {
    playerCount,
    serverCount,
    servers,
    serversLoading,
    serversError,
    refreshServers,
  } = useServerBrowserData();
  const {
    modsState,
    modsLoading,
    modsError,
    refreshMods,
    setModEnabled,
    togglingFolders,
  } = useModsData(active === "mods");
  const {
    confirmOptionalContentPrompt,
    dismissLegacyInstall,
    dismissOptionalContentPrompt,
    gameActionDisabled,
    gameBusy,
    gameButtonLabel,
    gameInstallDir,
    gameInstalled,
    gameStatusText,
    handleLegacyInstallMigration,
    handleGameAction,
    handleGameActionMouseDown,
    handleLauncherUpdate,
    handleHdTexturesToggleRequest,
    handleVerifyGameFiles,
    launcherUpdateBusy,
    launcherUpdateState,
    legacyInstallInfo,
    legacyMigrationBusy,
    masterServerStatus,
    optionalContentBusy,
    optionalContentPrompt,
    overlayMessage,
    progressFile,
    progressPercent,
    progressText,
    canVerifyGameFiles,
    setGameActionError,
    setLauncherUpdateState,
    showLegacyInstallOverlay,
    showLauncherUpdateOverlay,
    statusColorClass,
    blockingInstallDirError,
  } = useLauncherController();

  const launcherUpdateVersionLabel = launcherUpdateState?.remoteVersion
    ? ` ${launcherUpdateState.remoteVersion}`
    : "";

  useEffect(() => {
    if (active !== "settings") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      playSettingsClick();
      setActive("play");
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [active]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-base text-ink">
      <HeroBackdrop />

      <main className="absolute inset-0 z-10 pt-[64px]">
        {active === "play" ? (
          <PlayView
            posts={newsPosts}
            onSettings={() => setActive("settings")}
            onGameAction={handleGameAction}
            onGameActionMouseDown={handleGameActionMouseDown}
            gameButtonLabel={gameButtonLabel}
            gameStatusText={gameStatusText}
            progressPercent={progressPercent}
            progressText={progressText}
            progressFile={progressFile}
            gameBusy={gameBusy}
            gameActionDisabled={gameActionDisabled}
            statusColorClass={statusColorClass}
          />
        ) : active === "news" ? (
          <NewsView
            posts={newsPosts}
            loading={newsLoading}
            error={newsError}
          />
        ) : active === "servers" ? (
          <ServersView
            servers={servers}
            loading={serversLoading}
            error={serversError}
            onRefresh={refreshServers}
          />
        ) : active === "mods" ? (
          <ModsView
            modsState={modsState}
            loading={modsLoading}
            error={modsError}
            onRefresh={refreshMods}
            onToggleMod={setModEnabled}
            togglingFolders={togglingFolders}
          />
        ) : active === "settings" ? (
          <SettingsView
            section={settingsSection}
            onBack={() => setActive("play")}
            gameInstalled={gameInstalled}
            gameInstallDir={gameInstallDir}
            onOpenGameLocation={() => {}}
            onRequestHdTexturesChange={handleHdTexturesToggleRequest}
            onVerifyGameFiles={() => {
              void handleVerifyGameFiles();
            }}
            verifyGameFilesDisabled={!canVerifyGameFiles}
          />
        ) : (
          null
        )}
      </main>

      <header className="absolute inset-x-0 top-0 z-40">
        <div className="scrim-top pointer-events-none absolute inset-x-0 top-0 h-32 -z-10" />
        <TopNav
          active={active}
          playerCount={playerCount}
          serverCount={serverCount}
          masterServerLabel={masterServerStatus.label}
          masterServerOnline={masterServerStatus.reachable}
          onChange={setActive}
          settingsActiveTab={settingsSection}
          onSettingsTabChange={setSettingsSection}
        />
      </header>

      {showLegacyInstallOverlay && legacyInstallInfo ? (
        <PopupOverlay
          title="Existing Install Found"
          message={`We found an existing R5Reloaded install at ${legacyInstallInfo.gameDir}. Do you want to move this launcher into that install and update the Start Menu shortcut? This requires elevated privileges.`}
          confirmLabel={legacyMigrationBusy ? "Moving" : "Use Existing Install"}
          confirmDisabled={legacyMigrationBusy}
          cancelLabel={legacyMigrationBusy ? undefined : "Not Now"}
          onConfirm={() => {
            void handleLegacyInstallMigration();
          }}
          onDismiss={() => {
            if (!legacyMigrationBusy) {
              void dismissLegacyInstall();
            }
          }}
        />
      ) : optionalContentPrompt ? (
        <PopupOverlay
          title={optionalContentPrompt.mode === "enable" ? "HD Textures" : "Remove HD Textures"}
          message={
            optionalContentPrompt.mode === "enable"
              ? optionalContentPrompt.summary
                ? `Download the optional HD textures?\nThis will download ${optionalContentPrompt.summary.fileCount} files totaling ${(
                    optionalContentPrompt.summary.totalBytes /
                    1024 /
                    1024 /
                    1024
                  ).toFixed(1)} GB.`
                : "Download the optional HD textures?\nChecking file count and total size..."
              : "Turning off HD Textures will delete all optional texture files. You will need to download them again if you want to use them later."
          }
          confirmLabel={
            optionalContentBusy || (optionalContentPrompt.mode === "enable" && !optionalContentPrompt.summary)
              ? optionalContentPrompt.mode === "enable"
                ? optionalContentPrompt.summary
                  ? "Starting"
                  : "Checking"
                : "Removing"
              : optionalContentPrompt.mode === "enable"
                ? "Download HD Textures"
                : "Delete HD Textures"
          }
          confirmDisabled={
            optionalContentBusy ||
            (optionalContentPrompt.mode === "enable" && !optionalContentPrompt.summary)
          }
          cancelLabel={optionalContentBusy ? undefined : "Cancel"}
          onConfirm={() => {
            void confirmOptionalContentPrompt();
          }}
          onDismiss={dismissOptionalContentPrompt}
        />
      ) : showLauncherUpdateOverlay ? (
        <PopupOverlay
          title="Launcher Update"
          message={
            launcherUpdateBusy
              ? `Downloading launcher update${launcherUpdateVersionLabel}...`
              : `A new launcher update${launcherUpdateState?.remoteVersion ? ` (${launcherUpdateState.remoteVersion})` : ""} is available. Do you want to update now?`
          }
          confirmLabel={launcherUpdateBusy ? "Updating" : "Update"}
          confirmDisabled={launcherUpdateBusy}
          cancelLabel={launcherUpdateBusy ? undefined : "Later"}
          onConfirm={() => {
            void handleLauncherUpdate();
          }}
          onDismiss={() => {
            if (!launcherUpdateBusy) {
              setLauncherUpdateState(null);
            }
          }}
        />
      ) : overlayMessage ? (
        <PopupOverlay
          title={blockingInstallDirError ? "Install Location" : undefined}
          message={overlayMessage}
          onDismiss={() => setGameActionError(null)}
        />
      ) : null}
    </div>
  );
}
