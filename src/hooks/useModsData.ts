import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { InstalledModEntry, InstalledModsState } from "../types/app";

const DEV_MODS: InstalledModEntry[] = [
  {
    folderName: "__dev_flowstate",
    enabled: true,
    name: "Flowstate Dev Build",
    modId: "flowstate_dev",
    description: "Development-only sample mod for launcher UI testing.",
    version: "0.9.0-dev",
    author: "R5Reloaded",
    hasManifest: true,
  },
  {
    folderName: "__dev_movement",
    enabled: false,
    name: "Movement Gym Test",
    modId: "movementgym_test",
    description: "Disabled sample entry to test toggle states and row spacing.",
    version: "0.2.4",
    author: "zee_x64",
    hasManifest: true,
  },
  {
    folderName: "__dev_missing_manifest",
    enabled: true,
    name: "Manifest Missing Mock",
    modId: "missing_manifest_mock",
    description: "Example fallback row for testing unusual metadata states.",
    version: "",
    author: "",
    hasManifest: false,
  },
];

function withDevMods(state: InstalledModsState): InstalledModsState {
  if (!import.meta.env.DEV) {
    return state;
  }

  const items = [...DEV_MODS, ...state.items];
  const enabledCount = items.filter((item) => item.enabled).length;

  return {
    ...state,
    totalCount: items.length,
    enabledCount,
    items,
  };
}

export function useModsData(active: boolean) {
  const [modsState, setModsState] = useState<InstalledModsState | null>(null);
  const [modsLoading, setModsLoading] = useState(true);
  const [modsError, setModsError] = useState<string | null>(null);
  const [togglingFolders, setTogglingFolders] = useState<Record<string, boolean>>({});

  const loadMods = async () => {
    try {
      const nextState = await invoke<InstalledModsState>("get_installed_mods_state");
      setModsState(withDevMods(nextState));
      setModsError(null);
    } catch (error: unknown) {
      setModsError(
        error instanceof Error
          ? error.message
          : "We couldn't load the installed mods right now.",
      );
    } finally {
      setModsLoading(false);
    }
  };

  useEffect(() => {
    if (!active && modsState) {
      return;
    }

    setModsLoading(true);
    void loadMods();
  }, [active]);

  return {
    modsState,
    modsLoading,
    modsError,
    togglingFolders,
    refreshMods: () => {
      setModsLoading(true);
      void loadMods();
    },
    setModEnabled: async (folderName: string, enabled: boolean) => {
      setTogglingFolders((current) => ({ ...current, [folderName]: true }));
      setModsError(null);

      try {
        const nextState = await invoke<InstalledModsState>("set_mod_enabled_state", {
          folderName,
          enabled,
        });
        setModsState(withDevMods(nextState));
      } catch (error: unknown) {
        setModsError(
          error instanceof Error
            ? error.message
            : "We couldn't update that mod right now.",
        );
      } finally {
        setTogglingFolders((current) => {
          const next = { ...current };
          delete next[folderName];
          return next;
        });
      }
    },
  };
}
