import { openPath } from "@tauri-apps/plugin-opener";
import { Group, Row, TwoWay, Button } from "../ui/Controls";
import type { LauncherSettingsPageProps } from "./settingsTypes";

export default function SettingsLauncherPage({
  launcherSettings,
  launcherVersion,
  gameInstalled,
  gameInstallDir,
  onOpenGameLocation,
  onRequestHdTexturesChange,
  onVerifyGameFiles,
  verifyGameFilesDisabled,
  setLauncherSettings,
}: LauncherSettingsPageProps) {
  return (
    <Group title="Launcher">
      <Row label="UI Sounds" hint="Play hover, click, and launch sounds">
        <TwoWay
          checked={launcherSettings.soundsEnabled}
          onChange={(value) =>
            setLauncherSettings((current) => ({ ...current, soundsEnabled: value }))
          }
          offLabel="Disabled"
          onLabel="Enabled"
        />
      </Row>
      <Row label="Close After Game Starts" hint="Automatically close the launcher after launch">
        <TwoWay
          checked={launcherSettings.closeAfterGameStarts}
          onChange={(value) =>
            setLauncherSettings((current) => ({ ...current, closeAfterGameStarts: value }))
          }
          offLabel="Disabled"
          onLabel="Enabled"
        />
      </Row>
      <Row label="Background Video" hint="Enable launcher background video playback">
        <TwoWay
          checked={launcherSettings.backgroundVideoEnabled}
          onChange={(value) =>
            setLauncherSettings((current) => ({ ...current, backgroundVideoEnabled: value }))
          }
          offLabel="Disabled"
          onLabel="Enabled"
        />
      </Row>
      <Row
        label="HD Textures"
        hint="Download or remove the optional high-resolution textures"
      >
        <TwoWay
          checked={launcherSettings.hdTexturesEnabled}
          onChange={onRequestHdTexturesChange}
          offLabel="Disabled"
          onLabel="Enabled"
        />
      </Row>
      <Row label="Verify Game Files" hint="Check installed files and redownload anything missing or changed">
        <div className="flex justify-end">
          <Button
            onClick={onVerifyGameFiles}
            disabled={verifyGameFilesDisabled}
            className="w-full justify-center"
          >
            Verify
          </Button>
        </div>
      </Row>
      <Row label="Open Game Location" hint="Open the current install folder in File Explorer">
        <div className="flex justify-end">
          <Button
            onClick={() => {
              if (!gameInstallDir) {
                return;
              }
              void openPath(gameInstallDir);
              onOpenGameLocation();
            }}
            disabled={!gameInstalled || !gameInstallDir}
            className="w-full justify-center"
          >
            Open Folder
          </Button>
        </div>
      </Row>
      <Row label="Launcher Version" hint="Current installed launcher build">
        <div className="flex h-9 items-center justify-end border border-white/10 bg-black/30 px-3 font-cond text-[13px] uppercase tracking-[0.04em] text-ink/84">
          {launcherVersion}
        </div>
      </Row>
    </Group>
  );
}
