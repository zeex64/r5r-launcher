import { useEffect, useMemo, useState } from "react";
import { RefreshCw, Search, Server } from "lucide-react";
import type { R5RServer } from "../../lib/r5rServers";
import { playSettingsClick, playUtilityHover } from "../../lib/uiSound";
import { Stepper, TwoWay } from "../ui/Controls";
import {
  buildServerOptions,
  getMapImage,
  prettifyMap,
  prettifyPlaylist,
  regionGroup,
  type ServerRegionFilter,
} from "./serverBrowserUtils";

let nextServerRefreshAt = 0;

function ServerRow({ server }: { server: R5RServer }) {
  const players = server.numPlayers || 0;
  const maxPlayers = server.maxPlayers || 0;
  const region = regionGroup(server.region);
  const mode = prettifyPlaylist(server.playlist);
  const map = prettifyMap(server.map);
  const mapImage = getMapImage(server.map);

  return (
    <button
      type="button"
      onMouseEnter={playUtilityHover}
      className="promo-card-apex group relative flex min-h-[56px] w-full items-center gap-3 overflow-hidden bg-[#3f3e44]/[80%] px-4 text-left transition-colors duration-150 hover:bg-[#4a4950]/[88%]"
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition-opacity duration-150"
        style={{ backgroundImage: `url("${mapImage}")` }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.98),rgba(0,0,0,0.40)_48%,rgba(0,0,0,0.0))]" />
      <span className="absolute left-[18px] right-0 top-0 h-[2px] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />
      <span className="absolute inset-x-0 bottom-0 h-[2px] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />
      <span className="absolute bottom-0 left-0 top-[18px] w-[2px] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />
      <span className="absolute inset-y-0 right-0 w-[2px] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />
      <span className="absolute left-0 top-[17px] h-[8px] w-[30px] origin-left rotate-[-45deg] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />

      <div className="relative min-w-[68px] py-2">
        <div className="font-cond text-[14px] uppercase tracking-[0.02em] text-ink/92 transition-colors duration-150 group-hover:text-ink">
          {region}
        </div>
      </div>

      <div className="relative min-w-0 flex-1 py-2 pr-3">
        <h3 className="truncate font-display text-[14px] font-bold uppercase leading-none tracking-[0.03em] text-ink transition-colors duration-150 group-hover:text-white">
          {server.name || "Unnamed Server"}
        </h3>
      </div>

      <div className="relative flex shrink-0 items-center gap-2 py-2">
        <div className="min-w-0 border border-white/10 bg-black/38 px-3 py-2 backdrop-blur-[2px]">
          <div className="flex items-center gap-3">
            <div className="truncate font-cond text-[13px] uppercase tracking-[0.03em] text-ink">
              {map}
            </div>
            <div className="truncate font-cond text-[10px] uppercase tracking-[0.06em] text-ink/60">
              {mode}
            </div>
          </div>
        </div>
        <div className="border border-white/10 bg-black/38 px-3 py-2 text-right backdrop-blur-[2px]">
          <div className="font-cond text-[13px] uppercase tracking-[0.03em] text-ink">
            {players}/{maxPlayers}
          </div>
        </div>
      </div>
    </button>
  );
}

export default function ServersView({
  servers,
  loading,
  error,
  onRefresh,
}: {
  servers: R5RServer[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const [query, setQuery] = useState("");
  const [region, setRegion] = useState<ServerRegionFilter>("All");
  const [onlyWithPlayers, setOnlyWithPlayers] = useState(false);
  const [hideEmptyServers, setHideEmptyServers] = useState(false);
  const [hideFullServers, setHideFullServers] = useState(false);
  const [mapFilter, setMapFilter] = useState("All");
  const [playlistFilter, setPlaylistFilter] = useState("All");
  const [refreshLockedUntil, setRefreshLockedUntil] = useState(() => nextServerRefreshAt);
  const [now, setNow] = useState(() => Date.now());

  const normalizedQuery = query.trim().toLowerCase();
  const mapOptions = useMemo(
    () => buildServerOptions(servers, (server) => server.map, prettifyMap, "Any map"),
    [servers],
  );
  const playlistOptions = useMemo(
    () =>
      buildServerOptions(
        servers,
        (server) => server.playlist,
        prettifyPlaylist,
        "Any playlist",
      ),
    [servers],
  );
  const filtered = useMemo(
    () =>
      servers
        .filter((server) => {
          const players = server.numPlayers || 0;
          const maxPlayers = server.maxPlayers || 0;

          if (region !== "All" && regionGroup(server.region) !== region) return false;
          if ((onlyWithPlayers || hideEmptyServers) && players <= 0) return false;
          if (hideFullServers && maxPlayers > 0 && players >= maxPlayers) return false;
          if (mapFilter !== "All" && server.map !== mapFilter) {
            return false;
          }
          if (playlistFilter !== "All" && server.playlist !== playlistFilter) {
            return false;
          }
          if (!normalizedQuery) return true;

          const haystack = [
            server.name,
            server.description,
            server.map,
            server.playlist,
            server.region,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return haystack.includes(normalizedQuery);
        })
        .sort((a, b) => (b.numPlayers || 0) - (a.numPlayers || 0)),
    [
      hideEmptyServers,
      hideFullServers,
      mapFilter,
      normalizedQuery,
      onlyWithPlayers,
      playlistFilter,
      region,
      servers,
    ],
  );
  useEffect(() => {
    setRefreshLockedUntil(nextServerRefreshAt);
    setNow(Date.now());
  }, []);

  useEffect(() => {
    if (refreshLockedUntil <= now) return;

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => window.clearInterval(interval);
  }, [now, refreshLockedUntil]);

  const refreshLocked = now < refreshLockedUntil;
  const refreshSecondsRemaining = refreshLocked
    ? Math.max(1, Math.ceil((refreshLockedUntil - now) / 1000))
    : 0;

  const handleRefresh = () => {
    if (refreshLocked) return;
    const nextNow = Date.now();
    nextServerRefreshAt = nextNow + 10_000;
    setNow(nextNow);
    setRefreshLockedUntil(nextServerRefreshAt);
    onRefresh();
  };

  return (
    <div className="relative h-full w-full overflow-hidden px-8 pb-8 pt-8">
      <div className="mx-auto flex h-full w-full max-w-[1460px] flex-col gap-3 fade-up">
        <div className="relative min-w-0">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink"
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search servers, maps, playlists..."
            className="h-10 w-full border border-white/10 bg-[#2e3035]/80 pl-10 pr-4 font-cond text-[13px] uppercase tracking-[0.03em] text-ink outline-none transition-colors focus:border-red placeholder:text-ink/60"
          />
        </div>

        {loading ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="font-cond text-[14px] uppercase tracking-[0.18em] text-ink">
              Loading live server list
            </div>
          </div>
        ) : error ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
            <Server size={26} className="text-red" strokeWidth={1.6} />
            <div className="font-display text-[26px] font-bold uppercase tracking-[0.05em] text-ink">
              Server list unavailable
            </div>
            <p className="max-w-[420px] text-[14px] leading-6 text-ink">{error}</p>
          </div>
        ) : (
          <div className="hud-scroll min-h-0 flex-1 overflow-auto pr-2">
            {filtered.length === 0 ? (
              <div className="flex min-h-full items-center justify-center">
                <div className="font-cond text-[13px] uppercase tracking-[0.18em] text-ink">
                  No servers match this filter
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filtered.map((server) => (
                  <ServerRow key={server.serverId || server.name} server={server} />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="group flex min-h-[52px] flex-col gap-3 bg-[#2e3035]/80 px-4 py-3 transition-colors duration-150">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-[330px] shrink-0">
              <div className="mb-2 font-cond text-[10px] uppercase tracking-[0.08em] text-ink/60">
                Region filter
              </div>
              <Stepper
                value={region}
                options={[
                  { value: "All", label: "All" },
                  { value: "NA", label: "NA" },
                  { value: "EU", label: "EU" },
                  { value: "Asia", label: "Asia" },
                ]}
                onChange={setRegion}
              />
            </div>
            <div className="grid min-w-[180px] grid-cols-1 gap-1">
              <div className="font-cond text-[10px] uppercase tracking-[0.08em] text-ink/60">
                Only servers with players
              </div>
              <TwoWay
                checked={onlyWithPlayers}
                onChange={setOnlyWithPlayers}
                offLabel="Off"
                onLabel="On"
              />
            </div>
            <div className="grid min-w-[150px] grid-cols-1 gap-1">
              <div className="font-cond text-[10px] uppercase tracking-[0.08em] text-ink/60">
                Hide empty
              </div>
              <TwoWay
                checked={hideEmptyServers}
                onChange={setHideEmptyServers}
                offLabel="Off"
                onLabel="On"
              />
            </div>
            <div className="grid min-w-[150px] grid-cols-1 gap-1">
              <div className="font-cond text-[10px] uppercase tracking-[0.08em] text-ink/60">
                Hide full
              </div>
              <TwoWay
                checked={hideFullServers}
                onChange={setHideFullServers}
                offLabel="Off"
                onLabel="On"
              />
            </div>
            <div className="ml-auto shrink-0">
              <button
                type="button"
                onClick={handleRefresh}
                onMouseEnter={playUtilityHover}
                onMouseDown={playSettingsClick}
                disabled={refreshLocked}
                className={`relative flex h-9 items-center gap-2 overflow-hidden border px-3 font-cond text-[12px] uppercase tracking-[0.06em] transition-colors duration-150 ${
                  refreshLocked
                    ? "cursor-default border-white/10 bg-black/20 text-ink/35"
                    : "border-white/20 bg-black/30 text-ink-dim hover:border-white/20 hover:bg-white/10 hover:text-ink"
                }`}
                aria-label="Refresh servers"
                title="Refresh servers"
              >
                <RefreshCw size={15} />
                <span>{refreshLocked ? `Refresh (${refreshSecondsRemaining})` : "Refresh"}</span>
                <span className="absolute inset-x-0 bottom-0 h-[2px] bg-red" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <div className="mb-2 font-cond text-[10px] uppercase tracking-[0.08em] text-ink/60">
                Map filter
              </div>
              <Stepper
                value={mapFilter}
                options={mapOptions}
                onChange={setMapFilter}
              />
            </div>
            <div className="min-w-0">
              <div className="mb-2 font-cond text-[10px] uppercase tracking-[0.08em] text-ink/60">
                Playlist filter
              </div>
              <Stepper
                value={playlistFilter}
                options={playlistOptions}
                onChange={setPlaylistFilter}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
