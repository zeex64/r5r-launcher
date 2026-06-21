import type React from "react";
import type { LaunchSettings } from "../../lib/launchSettings";
import type { LauncherSettings } from "../../lib/launcherSettings";

export type SettingsFieldSetter = <K extends keyof LaunchSettings>(
  key: K,
  value: LaunchSettings[K],
) => void;

export type GameSettingsPageProps = {
  settings: LaunchSettings;
  setField: SettingsFieldSetter;
  preview: string;
};

export type LauncherSettingsPageProps = {
  launcherSettings: LauncherSettings;
  launcherVersion: string;
  onRequestHdTexturesChange: (enabled: boolean) => void;
  onVerifyGameFiles: () => void;
  verifyGameFilesDisabled: boolean;
  setLauncherSettings: React.Dispatch<React.SetStateAction<LauncherSettings>>;
};
