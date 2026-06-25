import type { NewsPost } from "../../lib/ghostNews";
import PlayButton from "./PlayButton";
import PromoCarousel from "./PromoCarousel";
import UtilityButtons from "./UtilityButtons";

type PlayViewProps = {
  posts: NewsPost[];
  onSettings: () => void;
  onGameAction: () => void;
  onGameActionMouseDown: () => void;
  onLaunchAnyway: () => void;
  gameButtonLabel: string;
  gameStatusText: string;
  progressPercent: number;
  progressText: string | null;
  progressFile: string | null;
  gameBusy: boolean;
  gameActionDisabled: boolean;
  canLaunchAnyway: boolean;
  statusColorClass: string;
};

export default function PlayView({
  posts,
  onSettings,
  onGameAction,
  onGameActionMouseDown,
  onLaunchAnyway,
  gameButtonLabel,
  gameStatusText,
  progressPercent,
  progressText,
  progressFile,
  gameBusy,
  gameActionDisabled,
  canLaunchAnyway,
  statusColorClass,
}: PlayViewProps) {
  const primaryProgressLabel = gameBusy ? gameStatusText : progressFile || "Preparing files";
  const secondaryProgressLabel =
    progressText && progressText !== primaryProgressLabel ? progressText : null;
  const showProgress = gameBusy || Boolean(progressText) || Boolean(progressFile);

  return (
    <div className="relative h-full w-full">
      <div className="scrim-bottom pointer-events-none absolute inset-x-0 bottom-0 z-10 h-44" />

      <div
        className="absolute inset-x-6 bottom-6 z-30 flex flex-col gap-3 fade-up"
        style={{ animationDelay: "100ms" }}
      >
        <div className="flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <PlayButton
              onPrimaryAction={onGameAction}
              onPrimaryMouseDown={onGameActionMouseDown}
              onLaunchAnyway={onLaunchAnyway}
              buttonLabel={gameButtonLabel}
              statusText={gameStatusText}
              busy={gameBusy}
              disabled={gameActionDisabled}
              canLaunchAnyway={canLaunchAnyway}
              statusColorClass={statusColorClass}
            />
          </div>

          <div className="flex items-end gap-3">
            <UtilityButtons onSettings={onSettings} />
            <PromoCarousel posts={posts} />
          </div>
        </div>

        {showProgress ? (
          <div className="w-full min-w-0 text-legible">
            <div className="truncate px-1 font-cond text-[11px] uppercase tracking-[0.08em] text-ink/78">
              {primaryProgressLabel}
            </div>
            <div className="mt-2 h-[10px] w-full overflow-hidden border border-white/12 bg-black/35">
              <div
                className="h-full bg-[linear-gradient(90deg,#ff4a28_0%,#ff6c3c_50%,#ff4a28_100%)] transition-[width] duration-200"
                style={{ width: `${Math.max(progressPercent, gameBusy ? 4 : 0)}%` }}
              />
            </div>
            {secondaryProgressLabel ? (
              <div className="mt-1 px-1 font-cond text-[10px] uppercase tracking-[0.08em] text-ink/72">
                {secondaryProgressLabel}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
