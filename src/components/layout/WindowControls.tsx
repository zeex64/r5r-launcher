import { Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";

// Guard so the app still renders in a plain browser (preview/dev) where the
// Tauri runtime isn't injected.
const isTauri =
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
const appWindow = isTauri ? getCurrentWindow() : null;

export default function WindowControls() {
  return (
    <div className="flex h-full items-stretch">
      <button
        aria-label="Minimize"
        onClick={() => appWindow?.minimize()}
        className="grid w-11 place-items-center text-ink-mute transition-colors hover:bg-white/5 hover:text-ink"
      >
        <Minus size={15} strokeWidth={2} />
      </button>
      <button
        aria-label="Maximize"
        onClick={() => appWindow?.toggleMaximize()}
        className="grid w-11 place-items-center text-ink-mute transition-colors hover:bg-white/5 hover:text-ink"
      >
        <Square size={11} strokeWidth={2} />
      </button>
      <button
        aria-label="Close"
        onClick={() => appWindow?.close()}
        className="grid w-11 place-items-center text-ink-mute transition-colors hover:bg-red hover:text-white"
      >
        <X size={16} strokeWidth={2} />
      </button>
    </div>
  );
}
