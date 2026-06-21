import { useEffect } from "react";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";

const WINDOW_STATE_STORAGE_KEY = "r5r.window-size-state";
const WINDOW_RESIZE_SAVE_DELAY_MS = 200;

type SavedWindowState = {
  width: number;
  height: number;
  maximized: boolean;
};

function loadSavedWindowState(): SavedWindowState | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(WINDOW_STATE_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<SavedWindowState>;
    if (
      typeof parsed.width !== "number" ||
      !Number.isFinite(parsed.width) ||
      typeof parsed.height !== "number" ||
      !Number.isFinite(parsed.height)
    ) {
      return null;
    }

    return {
      width: parsed.width,
      height: parsed.height,
      maximized: parsed.maximized === true,
    };
  } catch {
    return null;
  }
}

function saveWindowState(state: SavedWindowState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WINDOW_STATE_STORAGE_KEY, JSON.stringify(state));
}

export function useWindowState() {
  useEffect(() => {
    const appWindow = getCurrentWindow();
    let resizeSaveTimer: number | undefined;
    let unlistenResize: (() => void) | undefined;

    const persistCurrentWindowState = async (width?: number, height?: number) => {
      try {
        const maximized = await appWindow.isMaximized();
        if (maximized) {
          const currentSize = await appWindow.innerSize();
          saveWindowState({
            width: currentSize.width,
            height: currentSize.height,
            maximized: true,
          });
          return;
        }

        let nextWidth = width;
        let nextHeight = height;
        if (
          typeof nextWidth !== "number" ||
          !Number.isFinite(nextWidth) ||
          typeof nextHeight !== "number" ||
          !Number.isFinite(nextHeight)
        ) {
          const currentSize = await appWindow.innerSize();
          nextWidth = currentSize.width;
          nextHeight = currentSize.height;
        }

        saveWindowState({
          width: nextWidth,
          height: nextHeight,
          maximized: false,
        });
      } catch {
        // Ignore window state persistence failures so they never block the UI.
      }
    };

    void (async () => {
      const savedState = loadSavedWindowState();
      if (savedState) {
        try {
          if (savedState.maximized) {
            await appWindow.maximize();
          } else {
            await appWindow.setSize(new LogicalSize(savedState.width, savedState.height));
            await appWindow.center();
          }
        } catch {
          // Fall back to Tauri's default startup size if restore fails.
        }
      } else {
        void persistCurrentWindowState();
      }

      unlistenResize = await appWindow.onResized(({ payload: size }) => {
        if (resizeSaveTimer) {
          window.clearTimeout(resizeSaveTimer);
        }
        resizeSaveTimer = window.setTimeout(() => {
          void persistCurrentWindowState(size.width, size.height);
        }, WINDOW_RESIZE_SAVE_DELAY_MS);
      });
    })();

    return () => {
      if (resizeSaveTimer) {
        window.clearTimeout(resizeSaveTimer);
      }
      unlistenResize?.();
    };
  }, []);
}
