import { ASSETS } from "../../config/assets";
import { playNavHover, playSettingsClick, playSettingsHover } from "../../lib/uiSound";

type PlayButtonProps = {
  onPrimaryAction: () => void;
  onPrimaryMouseDown: () => void;
  onLaunchAnyway?: () => void;
  buttonLabel: string;
  statusText: string;
  busy: boolean;
  disabled: boolean;
  canLaunchAnyway?: boolean;
  statusColorClass: string;
};

function PlayStatus({
  statusText,
  statusColorClass,
  onLaunchAnyway,
  canLaunchAnyway,
}: Pick<PlayButtonProps, "statusText" | "statusColorClass" | "onLaunchAnyway" | "canLaunchAnyway">) {
  return (
    <div className="flex items-center gap-3 whitespace-nowrap px-1">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusColorClass}`} />
        <span className="truncate font-cond text-[11px] uppercase tracking-wide text-ink-dim">
          {statusText}
        </span>
      </div>
      {canLaunchAnyway ? (
        <button
          type="button"
          onClick={onLaunchAnyway}
          onMouseEnter={playSettingsHover}
          onMouseDown={playSettingsClick}
          className="shrink-0 font-cond text-[11px] uppercase tracking-[0.08em] text-white/72 transition-colors hover:text-white"
        >
          Launch Anyway
        </button>
      ) : null}
    </div>
  );
}

function PlayButtonFrame() {
  return (
    <>
      <span className="absolute inset-x-0 top-0 h-[2px] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />
      <span className="absolute bottom-0 left-0 top-0 w-[2px] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />
      <span className="absolute bottom-0 right-0 top-0 w-[2px] bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f]" />
      <span className="absolute left-1/2 top-0 h-[10px] w-[60%] -translate-x-1/2 bg-white transition-colors duration-200 group-hover:bg-[#ff5a2f] [clip-path:polygon(0_0,100%_0,92%_100%,8%_100%)]" />
    </>
  );
}

export default function PlayButton({
  onPrimaryAction,
  onPrimaryMouseDown,
  onLaunchAnyway,
  buttonLabel,
  statusText,
  busy,
  disabled,
  canLaunchAnyway,
  statusColorClass,
}: PlayButtonProps) {
  return (
    <div className="min-w-0 text-legible">
      <div className="relative flex flex-col gap-3">
        {!busy ? (
          <PlayStatus
            statusText={statusText}
            statusColorClass={statusColorClass}
            onLaunchAnyway={onLaunchAnyway}
            canLaunchAnyway={canLaunchAnyway}
          />
        ) : null}

        <div className="flex items-end gap-3">
          <button
            className={`play-button-apex group relative h-[92px] w-[358px] shrink-0 overflow-hidden px-6 ${
              disabled ? "cursor-default opacity-80" : ""
            }`}
            type="button"
            onClick={onPrimaryAction}
            onMouseEnter={playNavHover}
            onMouseDown={onPrimaryMouseDown}
            disabled={disabled}
            style={{
              boxShadow: "0 10px 22px rgba(0,0,0,0.38)",
            }}
          >
            <span
              className="absolute inset-0 bg-center bg-cover bg-no-repeat"
              style={{ backgroundImage: `url(${ASSETS.buttonBg})` }}
            />
            <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(12,16,22,0.18)_0%,rgba(16,20,27,0.08)_18%,rgba(16,19,24,0.06)_46%,rgba(8,10,12,0.2)_76%,rgba(11,12,13,0.28)_100%)] transition-opacity duration-150 group-hover:opacity-90" />
            <span className="absolute inset-0 opacity-55">
              <span className="absolute left-0 top-0 h-full w-1/2 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(0,0,0,0.08))] [clip-path:polygon(0_0,100%_0,68%_100%,0_100%)]" />
              <span className="absolute left-1/2 top-0 h-full w-1/2 -translate-x-[8%] bg-[linear-gradient(180deg,rgba(255,255,255,0.015),rgba(0,0,0,0.1))] [clip-path:polygon(32%_0,100%_0,100%_100%,0_100%)]" />
            </span>
            <span className="play-button-sheen absolute -left-1/3 top-0 h-full w-1/3 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.08)_45%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.08)_55%,transparent_100%)] opacity-70" />
            <span className="absolute inset-0 bg-[radial-gradient(130%_88%_at_50%_112%,rgba(255,99,61,0.34)_0%,rgba(255,99,61,0.16)_38%,rgba(255,99,61,0.04)_58%,transparent_72%)] opacity-95 transition-opacity duration-200 group-hover:opacity-100" />

            <PlayButtonFrame />

            <span className="pointer-events-none absolute inset-[2px] border border-transparent opacity-0 shadow-[inset_0_0_18px_rgba(255,97,56,0.42)] transition-opacity duration-200 group-hover:opacity-100" />
            <span className="play-button-glow absolute inset-x-0 bottom-0 h-[8px] bg-[linear-gradient(90deg,#ff4a28_0%,#ff6c3c_50%,#ff4a28_100%)] shadow-[0_0_18px_rgba(255,97,56,1)]" />

            <span className="play-button-label relative flex h-full items-center justify-center font-display text-[26px] font-semibold uppercase tracking-[0.05em] text-white">
              {buttonLabel}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
