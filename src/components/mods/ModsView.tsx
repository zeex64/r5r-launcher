import { useMemo, useState } from "react";
import { Boxes, RefreshCw, Search } from "lucide-react";
import type { InstalledModEntry, InstalledModsState } from "../../types/app";
import { playSettingsClick, playUtilityHover } from "../../lib/uiSound";
import { TwoWay } from "../ui/Controls";

function ModRow({
  mod,
  busy,
  onToggle,
}: {
  mod: InstalledModEntry;
  busy: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  return (
    <div
      onMouseEnter={playUtilityHover}
      className="mod-card-apex group relative flex min-h-[74px] w-full items-center gap-4 overflow-hidden bg-[#2e3035]/80 px-4 py-3"
    >
      <span className="promo-card-dot-overlay pointer-events-none absolute inset-y-0 left-0 w-[30%] opacity-55 [transform:scaleX(-1)]" />
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_18%_78%,rgba(255,90,47,0.14),transparent_32%)] opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
      <span className="absolute left-[18px] right-0 top-0 h-[2px] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />
      <span className="absolute inset-x-0 bottom-0 h-[2px] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />
      <span className="absolute bottom-0 left-0 top-[18px] w-[2px] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />
      <span className="absolute inset-y-0 right-0 w-[2px] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />
      <span className="absolute left-0 top-[17px] h-[8px] w-[30px] origin-left rotate-[-45deg] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />
      <span className="absolute bottom-[17px] right-0 h-[8px] w-[30px] origin-right rotate-[-45deg] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />

      <div className="relative min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h3 className="truncate font-display text-[15px] font-bold uppercase tracking-[0.03em] text-ink">
            {mod.name}
          </h3>
          {mod.version ? (
            <span className="shrink-0 font-cond text-[10px] uppercase tracking-[0.08em] text-ink/60">
              v{mod.version}
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-cond text-[10px] uppercase tracking-[0.08em] text-ink/58">
          <span>Author {mod.author || "Unknown"}</span>
          {!mod.hasManifest ? <span>No mod.vdf</span> : null}
        </div>
        {mod.description ? (
          <p className="mt-2 line-clamp-1 text-[12px] leading-5 text-ink/78">
            {mod.description}
          </p>
        ) : null}
      </div>

      <div className="relative w-[220px] shrink-0">
        <div className={busy ? "pointer-events-none opacity-60" : ""}>
          <TwoWay
            checked={mod.enabled}
            onChange={onToggle}
            offLabel="Disabled"
            onLabel="Enabled"
          />
        </div>
      </div>
    </div>
  );
}

export default function ModsView({
  modsState,
  loading,
  error,
  onRefresh,
  onToggleMod,
  togglingFolders,
}: {
  modsState: InstalledModsState | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onToggleMod: (folderName: string, enabled: boolean) => void;
  togglingFolders: Record<string, boolean>;
}) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const items = modsState?.items ?? [];
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return items;
    }

    return items.filter((mod) =>
      [mod.name, mod.folderName, mod.modId, mod.author, mod.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [modsState?.items, query]);

  return (
    <div className="relative h-full w-full overflow-hidden px-8 pb-8 pt-8">
      <div className="mx-auto flex h-full w-full max-w-[1460px] flex-col gap-3 fade-up">
        <div className="flex items-center gap-3">
          <div className="relative min-w-0 flex-1">
            <Search
              size={15}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search installed mods..."
              className="h-10 w-full border border-white/10 bg-[#2e3035]/80 pl-10 pr-4 font-cond text-[13px] uppercase tracking-[0.03em] text-ink outline-none transition-colors focus:border-red placeholder:text-ink/60"
            />
          </div>
          <button
            type="button"
            onClick={onRefresh}
            onMouseEnter={playUtilityHover}
            onMouseDown={playSettingsClick}
            className="relative flex h-10 shrink-0 items-center gap-2 overflow-hidden border border-white/20 bg-black/30 px-3 font-cond text-[12px] uppercase tracking-[0.06em] text-ink-dim transition-colors duration-150 hover:border-white/20 hover:bg-white/10 hover:text-ink"
          >
            <RefreshCw size={15} />
            <span>Refresh</span>
            <span className="absolute inset-x-0 bottom-0 h-[2px] bg-red" />
          </button>
        </div>

        <div className="flex min-h-[48px] items-center gap-4 bg-[#2e3035]/80 px-4 py-3">
          <div className="font-display text-[18px] font-bold uppercase tracking-[0.04em] text-ink">
            Mods
          </div>
          <div className="font-cond text-[11px] uppercase tracking-[0.08em] text-ink/60">
            {modsState?.enabledCount ?? 0} enabled
          </div>
          <div className="font-cond text-[11px] uppercase tracking-[0.08em] text-ink/60">
            {modsState?.totalCount ?? 0} installed
          </div>
        </div>

        {loading ? (
          <div className="flex min-h-0 flex-1 items-center justify-center">
            <div className="font-cond text-[14px] uppercase tracking-[0.18em] text-ink">
              Loading installed mods
            </div>
          </div>
        ) : error && !modsState ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 text-center">
            <Boxes size={26} className="text-red" strokeWidth={1.6} />
            <div className="font-display text-[26px] font-bold uppercase tracking-[0.05em] text-ink">
              Mods unavailable
            </div>
            <p className="max-w-[520px] text-[14px] leading-6 text-ink">{error}</p>
          </div>
        ) : (
          <div className="hud-scroll min-h-0 flex-1 overflow-auto pr-2">
            {filtered.length === 0 ? (
              <div className="flex min-h-full items-center justify-center">
                <div className="font-cond text-[13px] uppercase tracking-[0.18em] text-ink">
                  {modsState?.totalCount
                    ? "No mods match this search"
                    : "No mods found in the mods folder"}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filtered.map((mod) => (
                  <ModRow
                    key={mod.folderName}
                    mod={mod}
                    busy={Boolean(togglingFolders[mod.folderName])}
                    onToggle={(enabled) => onToggleMod(mod.folderName, enabled)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
