import { Server, Shield, Users } from "lucide-react";
import { playNavClick, playNavHover } from "../../lib/uiSound";
import { ASSETS } from "../../config/assets";
import WindowControls from "./WindowControls";

export type NavId =
  | "play"
  | "servers"
  | "mods"
  | "news"
  | "settings";
export type SettingsNavId = "launcher" | "game" | "credits";

const TABS: { id: NavId; label: string }[] = [
  { id: "play", label: "Play" },
  { id: "servers", label: "Servers" },
  { id: "mods", label: "Mods" },
  { id: "news", label: "News" },
];
const SETTINGS_TABS: { id: SettingsNavId; label: string }[] = [
  { id: "game", label: "Game" },
  { id: "launcher", label: "Launcher" },
  { id: "credits", label: "Credits" },
];

function Stat({
  icon: Icon,
  value,
  iconClassName,
}: {
  icon: typeof Users;
  value: string;
  iconClassName?: string;
}) {
  return (
    <div className="apex-nav-stat">
      <Icon size={15} strokeWidth={2.2} className={iconClassName} />
      <span>{value}</span>
    </div>
  );
}

export default function TopNav({
  active,
  playerCount,
  serverCount,
  masterServerLabel,
  masterServerOnline,
  onChange,
  settingsActiveTab = "launcher",
  onSettingsTabChange,
}: {
  active: NavId;
  playerCount: string;
  serverCount: string;
  masterServerLabel: string;
  masterServerOnline: boolean;
  onChange: (id: NavId) => void;
  settingsActiveTab?: SettingsNavId;
  onSettingsTabChange?: (id: SettingsNavId) => void;
}) {
  const isSettingsMode = active === "settings";
  const settingsSubtitle =
    settingsActiveTab === "launcher"
      ? "Launcher Preferences"
      : settingsActiveTab === "game"
        ? "Game Startup Parameters"
        : "People Behind The Project";

  return (
    <div className="apex-topnav-shell">
      <div
        data-tauri-drag-region
        className={`apex-topnav-band ${isSettingsMode ? "apex-topnav-band-settings" : ""}`}
      >
        {isSettingsMode ? (
          <div data-tauri-drag-region className="apex-topnav-settings-title">
            <span className="font-display text-[28px] font-bold uppercase leading-none tracking-[0.06em] text-ink">
              Settings
            </span>
            <span className="mt-1 font-cond text-[11px] uppercase tracking-[0.22em] text-ink/60">
              {settingsSubtitle}
            </span>
          </div>
        ) : (
          <div data-tauri-drag-region className="apex-topnav-logo">
            <img
              src={ASSETS.topArt}
              alt=""
              draggable={false}
              data-tauri-drag-region
              className="apex-topnav-logo-art"
            />
          </div>
        )}

        <div className="apex-topnav-center">
          <nav className={`apex-topnav-tabs ${isSettingsMode ? "apex-topnav-tabs-settings" : ""}`}>
            {(isSettingsMode ? SETTINGS_TABS : TABS).map(({ id, label }) => {
              const on = isSettingsMode ? settingsActiveTab === id : active === id;
              return (
                <div
                  key={id}
                  className={`apex-topnav-tab-shell ${on ? "is-active" : ""}`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      isSettingsMode
                        ? onSettingsTabChange?.(id as SettingsNavId)
                        : onChange(id as NavId)
                    }
                    onMouseEnter={playNavHover}
                    onMouseDown={playNavClick}
                    className={`apex-topnav-tab ${on ? "is-active" : ""}`}
                  >
                    <span className="apex-topnav-tab-label">{label}</span>
                    <span className="apex-topnav-tab-edge" />
                  </button>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="apex-topnav-status">
          {isSettingsMode ? null : (
            <>
              <Stat icon={Users} value={playerCount} />
              <Stat icon={Server} value={serverCount} />
            </>
          )}
          {!isSettingsMode ? (
            <Stat
              icon={Shield}
              value={masterServerLabel}
              iconClassName={masterServerOnline ? "text-online" : "text-red"}
            />
          ) : null}
        </div>

        <div className="apex-topnav-window">
          <WindowControls />
        </div>
      </div>
    </div>
  );
}
