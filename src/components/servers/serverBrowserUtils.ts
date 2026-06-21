import type { R5RServer } from "../../lib/r5rServers";

export type ServerRegionFilter = "All" | "NA" | "EU" | "Asia";

const MAP_IMAGE_NAMES = new Set([
  "mp_rr_aqueduct",
  "mp_rr_aqueduct_night",
  "mp_rr_arena_composite",
  "mp_rr_arena_phase_runner",
  "mp_rr_arena_skygarden",
  "mp_rr_ashs_redemption",
  "mp_rr_box",
  "mp_rr_canyonlands_64k_x_64k",
  "mp_rr_canyonlands_mu1",
  "mp_rr_canyonlands_mu1_night",
  "mp_rr_canyonlands_staging",
  "mp_rr_desertlands_64k_x_64k",
  "mp_rr_desertlands_64k_x_64k_nx",
  "mp_rr_desertlands_64k_x_64k_tt",
  "mp_rr_olympus",
  "mp_rr_olympus_mu1",
  "mp_rr_olympus_mu2",
  "mp_rr_olympus_tt",
  "mp_rr_party_crasher",
]);

function prettify(value: string | undefined, prefix: RegExp, fallback: string) {
  if (!value) return fallback;
  return value
    .replace(prefix, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char: string) => char.toUpperCase());
}

export function prettifyMap(map?: string) {
  switch (map) {
    case "mp_rr_canyonlands_staging":
      return "Firing Range";
    case "mp_rr_aqueduct":
      return "Overflow";
    case "mp_rr_aqueduct_night":
      return "Overflow After Dark";
    case "mp_rr_ashs_redemption":
      return "Ashs Redemption";
    case "mp_rr_box":
      return "Box";
    case "mp_rr_canyonlands_64k_x_64k":
      return "Kings Canyon S1";
    case "mp_rr_canyonlands_mu1":
      return "Kings Canyon S2";
    case "mp_rr_canyonlands_mu1_night":
      return "Kings Canyon S2 After Dark";
    case "mp_rr_desertlands_64k_x_64k":
      return "Worlds Edge";
    case "mp_rr_desertlands_64k_x_64k_nx":
      return "Worlds Edge After Dark";
    case "mp_rr_desertlands_64k_x_64k_tt":
      return "Worlds Edge Mirage Voyage";
    case "mp_rr_olympus":
      return "Olympus";
    case "mp_rr_olympus_mu1":
      return "Olympus S9";
    case "mp_rr_olympus_mu2":
      return "Olympus S12";
    case "mp_rr_olympus_tt":
      return "Olympus TT";
    case "mp_rr_arena_composite":
      return "Drop Off";
    case "mp_rr_arena_phase_runner":
      return "Phase Runner";
    case "mp_rr_arena_skygarden":
      return "Encore";
    case "mp_rr_party_crasher":
      return "Party Crasher";
    case "mp_lobby":
      return "Lobby";
    default:
      return map || "Unknown Map";
  }
}

export function prettifyPlaylist(playlist?: string) {
  return prettify(playlist, /^fs_/, "Unknown Mode");
}

export function getMapImage(map?: string) {
  const imageName = map && MAP_IMAGE_NAMES.has(map) ? map : "mp_rr_missing_map_image";
  return `/assets/maps/${imageName}.webp`;
}

export function regionGroup(region?: string) {
  if (!region) return "Other";
  if (["US", "CA", "MX", "NA"].includes(region)) return "NA";
  if (["AT", "NL", "DE", "FR", "UK", "EU"].includes(region)) return "EU";
  if (["CN", "HK", "JP", "KR", "SG", "TW"].includes(region)) return "Asia";
  return "Other";
}

export function buildServerOptions(
  servers: R5RServer[],
  getValue: (server: R5RServer) => string | undefined,
  getLabel: (value?: string) => string,
  fallbackLabel: string,
) {
  return [
    { value: "All", label: fallbackLabel },
    ...Array.from(
      new Map(
        servers
          .map(getValue)
          .filter((value): value is string => Boolean(value))
          .map((value) => [value, getLabel(value)]),
      ),
    ).map(([value, label]) => ({ value, label })),
  ];
}
