import { useEffect, useState } from "react";
import {
  Group,
  Row,
  FullRow,
  Stepper,
  TwoWay,
  Select,
  StepSlider,
  RowText,
} from "../ui/Controls";
import type { LaunchMode } from "../../lib/launchSettings";
import type { GameSettingsPageProps } from "./settingsTypes";

const MODE_OPTS: { value: LaunchMode; label: string }[] = [
  { value: "CLIENT", label: "Join Only" },
  { value: "HOST", label: "Join & Host" },
  { value: "SERVER", label: "Dedicated Server" },
];

const MODE_DESC: Record<LaunchMode, string> = {
  CLIENT:
    "Only join existing servers. You cannot load into maps or start your own server in this mode.",
  HOST:
    "Recommended for most players. Join servers, create your own server, and load into maps with the full game client.",
  SERVER: "Run a dedicated server for other players to join.",
};

export default function SettingsGamePage({
  settings,
  setField,
  preview,
  resolutionOptions,
}: GameSettingsPageProps) {
  const showServerCfg = settings.launchMode === "SERVER";
  const matchedDetectedResolution = resolutionOptions.some(
    (option) =>
      option.width.toString() === settings.resW && option.height.toString() === settings.resH,
  );
  const [resolutionMode, setResolutionMode] = useState<"preset" | "custom">(
    matchedDetectedResolution ? "preset" : "custom",
  );

  useEffect(() => {
    if (!matchedDetectedResolution) {
      setResolutionMode("custom");
    }
  }, [matchedDetectedResolution, settings.resW, settings.resH]);

  const selectedResolutionValue =
    resolutionMode === "custom" || !matchedDetectedResolution
      ? "custom"
      : `${settings.resW}x${settings.resH}`;
  const showCustomResolutionFields = resolutionMode === "custom" || resolutionOptions.length === 0;
  const maxFpsValue = Math.min(300, Math.max(0, Number.parseInt(settings.maxFps || "0", 10) || 0));

  return (
    <>
      <Group title="Session Mode">
        <Row label="Session Mode" hint={MODE_DESC[settings.launchMode]}>
          <Stepper
            value={settings.launchMode}
            options={MODE_OPTS}
            onChange={(value) => setField("launchMode", value)}
          />
        </Row>
        {showServerCfg && (
          <>
            <Row label="Server Name">
              <RowText
                value={settings.hostname}
                onChange={(value) => setField("hostname", value)}
                placeholder="My R5 Server"
              />
            </Row>
            <Row label="Description">
              <RowText
                value={settings.hostdesc}
                onChange={(value) => setField("hostdesc", value)}
                placeholder="Welcome - have fun!"
              />
            </Row>
            <Row label="Visibility">
              <Stepper
                value={settings.visibility}
                onChange={(value) => setField("visibility", value)}
                options={[
                  { value: 0, label: "Offline" },
                  { value: 1, label: "Hidden" },
                  { value: 2, label: "Public" },
                ]}
              />
            </Row>
            <Row label="Password">
              <RowText
                value={settings.serverPassword}
                onChange={(value) => setField("serverPassword", value)}
                placeholder="optional"
                type="password"
              />
            </Row>
            <Row label="Port">
              <RowText
                value={settings.hostport}
                onChange={(value) => setField("hostport", value)}
                placeholder="37015"
                type="number"
              />
            </Row>
            <Row label="Map">
              <RowText
                value={settings.map}
                onChange={(value) => setField("map", value)}
                placeholder="mp_rr_canyonlands_mu1"
              />
            </Row>
            <Row label="Playlist">
              <RowText
                value={settings.playlist}
                onChange={(value) => setField("playlist", value)}
                placeholder="survival"
              />
            </Row>
          </>
        )}
      </Group>

      <Group title="Graphics">
        <Row label="Resolution">
          <Select
            value={selectedResolutionValue}
            options={[
              ...resolutionOptions.map((option) => ({
                value: `${option.width}x${option.height}`,
                label: option.label,
              })),
              { value: "custom", label: "Custom" },
            ]}
            placeholder="Select a resolution"
            onChange={(value) => {
              if (value === "custom") {
                setResolutionMode("custom");
                return;
              }
              if (!value) return;
              const [w, h] = value.split("x");
              setResolutionMode("preset");
              setField("resW", w);
              setField("resH", h);
            }}
          />
        </Row>
        {showCustomResolutionFields ? (
          <>
            <Row label="Width">
              <RowText
                value={settings.resW}
                onChange={(value) => setField("resW", value)}
                placeholder="1920"
                type="number"
              />
            </Row>
            <Row label="Height">
              <RowText
                value={settings.resH}
                onChange={(value) => setField("resH", value)}
                placeholder="1080"
                type="number"
              />
            </Row>
          </>
        ) : null}
        <Row label="Max FPS">
          <StepSlider
            value={maxFpsValue}
            min={0}
            max={300}
            onChange={(value) => setField("maxFps", value.toString())}
            display={maxFpsValue === 0 ? "Unlimited" : maxFpsValue.toString()}
          />
        </Row>
        <Row label="Windowed Mode">
          <TwoWay checked={settings.windowed} onChange={(value) => setField("windowed", value)} />
        </Row>
        <Row label="Borderless">
          <TwoWay
            checked={settings.borderless}
            onChange={(value) => setField("borderless", value)}
          />
        </Row>
      </Group>

      <Group title="Network">
        <Row label="Matchmaking Hostname">
          <RowText
            value={settings.matchmakingHostname}
            onChange={(value) => setField("matchmakingHostname", value)}
            placeholder="r5r.org"
          />
        </Row>
        <Row label="Encrypt Packets" hint="Secure network communication">
          <TwoWay
            checked={settings.encryptPackets}
            onChange={(value) => setField("encryptPackets", value)}
          />
        </Row>
        <Row label="Random Network Key" hint="Generate unique connection key">
          <TwoWay
            checked={settings.randomNetkey}
            onChange={(value) => setField("randomNetkey", value)}
          />
        </Row>
        <Row label="Queued Packets" hint="Buffer network data">
          <TwoWay
            checked={settings.queuedPackets}
            onChange={(value) => setField("queuedPackets", value)}
          />
        </Row>
        <Row label="Disable Timeouts" hint="Prevent connection drops">
          <TwoWay checked={settings.noTimeout} onChange={(value) => setField("noTimeout", value)} />
        </Row>
      </Group>

      <Group title="Debug">
        <Row label="Offline Mode" hint="Launches without connecting to the masterserver. Play solo or on local network.">
          <TwoWay checked={settings.offlineMode} onChange={(value) => setField("offlineMode", value)} />
        </Row>
        <Row label="Developer" hint="Enables developer mode and console commands for debugging and testing.">
          <TwoWay
            checked={settings.enableDeveloper}
            onChange={(value) => setField("enableDeveloper", value)}
          />
        </Row>
        <Row label="Cheats" hint="Enable cheat commands">
          <TwoWay checked={settings.enableCheats} onChange={(value) => setField("enableCheats", value)} />
        </Row>
        <Row label="Show Console" hint="Shows the console window">
          <TwoWay
            checked={settings.showConsole}
            onChange={(value) => setField("showConsole", value)}
          />
        </Row>
        <Row label="Console Overlay" hint="Shows DevMsg RUI console overlay">
          <TwoWay
            checked={settings.drawNotify}
            onChange={(value) => setField("drawNotify", value)}
          />
        </Row>
        <Row label="Matchmaking Debug" hint="Print masterserver debug info to console">
          <TwoWay
            checked={settings.showDebugInfo}
            onChange={(value) => setField("showDebugInfo", value)}
          />
        </Row>
        <Row label="FPS Counter" hint="Shows fps overlay in-game">
          <Stepper
            value={settings.showFps}
            onChange={(value) => setField("showFps", value)}
            options={[
              { value: "0", label: "Off" },
              { value: "1", label: "Detailed" },
              { value: "2", label: "FPS Only" },
            ]}
          />
        </Row>
        <Row label="Show Position" hint="Display coordinates in-game">
          <TwoWay checked={settings.showPos} onChange={(value) => setField("showPos", value)} />
        </Row>
      </Group>

      <Group title="Advanced">
        <Row label="Skip Intro Video" hint="Faster startup (-novid)">
          <TwoWay checked={settings.noVid} onChange={(value) => setField("noVid", value)} />
        </Row>
        <Row label="Disable Async Systems" hint="Force synchronous loading - may help with crashes on older CPUs">
          <TwoWay checked={settings.noAsync} onChange={(value) => setField("noAsync", value)} />
        </Row>
        <Row label="Reserved Cores" hint="-1 = auto">
          <RowText
            value={settings.reservedCores}
            onChange={(value) => setField("reservedCores", value)}
            placeholder="-1"
            type="number"
          />
        </Row>
        <Row label="Worker Threads" hint="-1 = auto">
          <RowText
            value={settings.workerThreads}
            onChange={(value) => setField("workerThreads", value)}
            placeholder="-1"
            type="number"
          />
        </Row>
        <Row label="ANSI Colors" hint="Colored console output">
          <TwoWay
            checked={settings.colorConsole}
            onChange={(value) => setField("colorConsole", value)}
          />
        </Row>
        <Row label="Playlist File">
          <RowText
            value={settings.playlistFile}
            onChange={(value) => setField("playlistFile", value)}
            placeholder="playlists_r5_patch.txt"
          />
        </Row>
        <FullRow>
          <span className="mb-1 w-full font-cond text-[11px] uppercase tracking-wider text-ink">
            Custom Command Line
          </span>
          <RowText
            value={settings.customCmd}
            onChange={(value) => setField("customCmd", value)}
            placeholder="Add custom launch arguments (e.g., +map mp_lobby). Separate with spaces."
            mono
          />
        </FullRow>
      </Group>

      <Group title="Final Launch Command">
        <FullRow>
          <div className="w-full border border-white/10 bg-black/30 px-3 py-2 font-mono text-[12px] text-ink/80">
            {preview || "No launch arguments"}
          </div>
        </FullRow>
      </Group>
    </>
  );
}
