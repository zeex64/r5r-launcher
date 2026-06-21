import {
  Group,
  Row,
  FullRow,
  Stepper,
  TwoWay,
  Choice,
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
}: GameSettingsPageProps) {
  const showServerCfg = settings.launchMode === "SERVER";

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
        <Row label="Windowed Mode" hint="Run in a resizable window">
          <TwoWay checked={settings.windowed} onChange={(value) => setField("windowed", value)} />
        </Row>
        <Row label="Borderless" hint="Remove window decorations">
          <TwoWay
            checked={settings.borderless}
            onChange={(value) => setField("borderless", value)}
          />
        </Row>
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
        <Row label="Max FPS" hint="0 = unlimited">
          <RowText
            value={settings.maxFps}
            onChange={(value) => setField("maxFps", value)}
            placeholder="0"
            type="number"
          />
        </Row>
        <Row label="Resolution">
          <Choice
            value={`${settings.resW}x${settings.resH}`}
            options={[
              { value: "1920x1080", label: "1080p" },
              { value: "2560x1440", label: "1440p" },
              { value: "3840x2160", label: "4K" },
            ]}
            onChange={(value) => {
              const [w, h] = value.split("x");
              setField("resW", w);
              setField("resH", h);
            }}
          />
        </Row>
        <Row label="Skip Intro Video" hint="Faster startup (-novid)">
          <TwoWay checked={settings.noVid} onChange={(value) => setField("noVid", value)} />
        </Row>
        <Row label="FPS Counter">
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
      </Group>

      <Group title="Performance">
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
        <Row label="Disable Async Systems" hint="May help crashes on older CPUs">
          <TwoWay checked={settings.noAsync} onChange={(value) => setField("noAsync", value)} />
        </Row>
      </Group>

      <Group title="Network">
        <Row label="Encrypt Packets" hint="Secure network communication">
          <TwoWay
            checked={settings.encryptPackets}
            onChange={(value) => setField("encryptPackets", value)}
          />
        </Row>
        <Row label="Random Network Key" hint="Unique key per session">
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
        <Row label="Matchmaking Debug" hint="Server browser debug overlay">
          <TwoWay
            checked={settings.showDebugInfo}
            onChange={(value) => setField("showDebugInfo", value)}
          />
        </Row>
        <Row label="Matchmaking Hostname">
          <RowText
            value={settings.matchmakingHostname}
            onChange={(value) => setField("matchmakingHostname", value)}
            placeholder="r5r.org"
          />
        </Row>
      </Group>

      <Group title="Console & Playlist">
        <Row label="Show Console" hint="Debug console window">
          <TwoWay
            checked={settings.showConsole}
            onChange={(value) => setField("showConsole", value)}
          />
        </Row>
        <Row label="ANSI Colors" hint="Colored console output">
          <TwoWay
            checked={settings.colorConsole}
            onChange={(value) => setField("colorConsole", value)}
          />
        </Row>
        <Row label="Show Position" hint="Display coordinates in-game">
          <TwoWay checked={settings.showPos} onChange={(value) => setField("showPos", value)} />
        </Row>
        <Row label="Console Overlay" hint="Show DevMsg output">
          <TwoWay
            checked={settings.drawNotify}
            onChange={(value) => setField("drawNotify", value)}
          />
        </Row>
        <Row label="Playlist File">
          <RowText
            value={settings.playlistFile}
            onChange={(value) => setField("playlistFile", value)}
            placeholder="playlists_r5_patch.txt"
          />
        </Row>
      </Group>

      <Group title="Advanced">
        <Row label="Developer" hint="Enable dev console & commands">
          <TwoWay
            checked={settings.enableDeveloper}
            onChange={(value) => setField("enableDeveloper", value)}
          />
        </Row>
        <Row label="Cheats" hint="Allow sv_cheats - private testing only">
          <TwoWay checked={settings.enableCheats} onChange={(value) => setField("enableCheats", value)} />
        </Row>
        <Row label="Offline Mode" hint="Launch without the masterserver">
          <TwoWay checked={settings.offlineMode} onChange={(value) => setField("offlineMode", value)} />
        </Row>
        <FullRow>
          <span className="mb-1 w-full font-cond text-[11px] uppercase tracking-wider text-ink-mute">
            Custom Command Line
          </span>
          <RowText
            value={settings.customCmd}
            onChange={(value) => setField("customCmd", value)}
            placeholder="+map mp_lobby"
            mono
          />
        </FullRow>
      </Group>

      <Group title="Launch Command">
        <FullRow>
          <span className="mb-1 w-full font-cond text-[11px] uppercase tracking-wider text-ink-mute">
            Preview
          </span>
          <div className="w-full border border-white/10 bg-black/30 px-3 py-2 font-mono text-[12px] text-ink/80">
            {preview || "No launch arguments"}
          </div>
        </FullRow>
      </Group>
    </>
  );
}
