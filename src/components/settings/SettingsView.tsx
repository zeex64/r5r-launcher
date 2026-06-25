import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";
import { ScreenShell } from "../ui/Controls";
import {
  buildLaunchArgumentsPreview,
  DEFAULT_LAUNCH_SETTINGS,
  hasSavedLaunchSettings,
  loadLaunchSettings,
  saveLaunchSettings,
  type LaunchSettings,
} from "../../lib/launchSettings";
import {
  LAUNCHER_SETTINGS_CHANGED_EVENT,
  loadLauncherSettings,
  saveLauncherSettings,
  DEFAULT_LAUNCHER_SETTINGS,
  type LauncherSettings,
} from "../../lib/launcherSettings";
import { playSettingsClick, playSettingsHover } from "../../lib/uiSound";
import type { ResolutionOption } from "../../types/app";
import type { SettingsNavId } from "../layout/TopNav";
import SettingsGamePage from "./gamePage";
import SettingsLauncherPage from "./launcherPage";
import SettingsCreditsPage from "./creditsPage";

export default function SettingsView({
  section,
  onBack,
  gameInstalled,
  gameInstallDir,
  onOpenGameLocation,
  onRequestHdTexturesChange,
  onVerifyGameFiles,
  verifyGameFilesDisabled,
}: {
  section: SettingsNavId;
  onBack: () => void;
  gameInstalled: boolean;
  gameInstallDir: string | null;
  onOpenGameLocation: () => void;
  onRequestHdTexturesChange: (enabled: boolean) => void;
  onVerifyGameFiles: () => void;
  verifyGameFilesDisabled: boolean;
}) {
  const [settings, setSettings] = useState<LaunchSettings>(() => loadLaunchSettings());
  const [launcherSettings, setLauncherSettings] = useState<LauncherSettings>(() =>
    loadLauncherSettings(),
  );
  const [resolutionOptions, setResolutionOptions] = useState<ResolutionOption[]>([]);
  const [launcherVersion, setLauncherVersion] = useState("Checking...");
  const preview = useMemo(() => buildLaunchArgumentsPreview(settings), [settings]);
  const buildDefaultLaunchSettings = (options: ResolutionOption[]): LaunchSettings => {
    const highestResolution = options[0];
    if (!highestResolution) {
      return { ...DEFAULT_LAUNCH_SETTINGS };
    }

    return {
      ...DEFAULT_LAUNCH_SETTINGS,
      resW: highestResolution.width.toString(),
      resH: highestResolution.height.toString(),
    };
  };

  useEffect(() => {
    saveLaunchSettings(settings);
  }, [settings]);

  useEffect(() => {
    saveLauncherSettings(launcherSettings);
  }, [launcherSettings]);

  useEffect(() => {
    const handleLauncherSettingsChanged = (event: Event) => {
      const detail = (event as CustomEvent<LauncherSettings>).detail;
      setLauncherSettings(detail ?? loadLauncherSettings());
    };

    window.addEventListener(
      LAUNCHER_SETTINGS_CHANGED_EVENT,
      handleLauncherSettingsChanged,
    );

    return () => {
      window.removeEventListener(
        LAUNCHER_SETTINGS_CHANGED_EVENT,
        handleLauncherSettingsChanged,
      );
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    void invoke<ResolutionOption[]>("get_primary_monitor_resolutions")
      .then((options) => {
        if (!mounted) return;
        setResolutionOptions(options);
        if (!hasSavedLaunchSettings()) {
          setSettings(buildDefaultLaunchSettings(options));
        }
      })
      .catch(() => {
        if (!mounted) return;
        setResolutionOptions([]);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    void getVersion()
      .then((version) => {
        if (!mounted) return;
        setLauncherVersion(version);
      })
      .catch(() => {
        if (!mounted) return;
        setLauncherVersion("Unknown");
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setField = <K extends keyof LaunchSettings>(key: K, value: LaunchSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const isLauncherSection = section === "launcher";
  const isCreditsSection = section === "credits";

  return (
    <ScreenShell
      title="Settings"
      subtitle="Game Startup Parameters"
      hideHeader
      footer={
        <div className="flex w-full items-center justify-start gap-8">
          <button
            type="button"
            onClick={onBack}
            onMouseEnter={playSettingsHover}
            onMouseDown={playSettingsClick}
            className="flex items-center gap-2 font-ui text-[18px] font-medium text-white/86 transition-colors hover:text-white"
          >
            <span className="inline-flex h-[20px] min-w-[28px] items-center justify-center border border-white/28 bg-white/8 px-1.5 font-cond text-[11px] uppercase tracking-[0.08em] text-white/92">
              Esc
            </span>
            <span>Back</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (isCreditsSection) {
                return;
              }
              if (isLauncherSection) {
                setLauncherSettings({
                  ...DEFAULT_LAUNCHER_SETTINGS,
                  hdTexturesEnabled: launcherSettings.hdTexturesEnabled,
                });
                return;
              }
              setSettings(buildDefaultLaunchSettings(resolutionOptions));
            }}
            onMouseEnter={playSettingsHover}
            onMouseDown={playSettingsClick}
            className={`font-ui text-[18px] font-medium transition-colors ${
              isCreditsSection
                ? "pointer-events-none text-white/28"
                : "text-white/72 hover:text-white"
            }`}
          >
            Restore Defaults
          </button>
        </div>
      }
    >
      {section === "launcher" ? (
        <SettingsLauncherPage
          launcherSettings={launcherSettings}
          launcherVersion={launcherVersion}
          gameInstalled={gameInstalled}
          gameInstallDir={gameInstallDir}
          onOpenGameLocation={onOpenGameLocation}
          onRequestHdTexturesChange={onRequestHdTexturesChange}
          onVerifyGameFiles={onVerifyGameFiles}
          verifyGameFilesDisabled={verifyGameFilesDisabled}
          setLauncherSettings={setLauncherSettings}
        />
      ) : section === "credits" ? (
        <SettingsCreditsPage />
      ) : (
        <SettingsGamePage
          settings={settings}
          setField={setField}
          preview={preview}
          resolutionOptions={resolutionOptions}
        />
      )}
    </ScreenShell>
  );
}
