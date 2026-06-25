import type React from "react";
import type { LaunchSettings } from "../../lib/launchSettings";
import type { LauncherSettings } from "../../lib/launcherSettings";
import type { ResolutionOption } from "../../types/app";

export type SettingsFieldSetter = <K extends keyof LaunchSettings>(
  key: K,
  value: LaunchSettings[K],
) => void;

export type GameSettingsPageProps = {
  settings: LaunchSettings;
  setField: SettingsFieldSetter;
  preview: string;
  resolutionOptions: ResolutionOption[];
};

export type LauncherSettingsPageProps = {
  launcherSettings: LauncherSettings;
  launcherVersion: string;
  gameInstalled: boolean;
  gameInstallDir: string | null;
  onOpenGameLocation: () => void;
  onRequestHdTexturesChange: (enabled: boolean) => void;
  onVerifyGameFiles: () => void;
  verifyGameFilesDisabled: boolean;
  setLauncherSettings: React.Dispatch<React.SetStateAction<LauncherSettings>>;
};
