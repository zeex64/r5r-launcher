import { areLauncherSoundsEnabled } from "./launcherSettings";

const HOVER_SRC = "/audio/ui/settings-hover.ogg";
const CLICK_SRC = "/audio/ui/settings-click.ogg";
const NAV_HOVER_SRC = "/audio/ui/nav-hover.ogg";
const NAV_CLICK_SRC = "/audio/ui/nav-click.ogg";
const UTILITY_HOVER_SRC = "/audio/ui/utility-hover.ogg";
const GAME_LAUNCH_SRC = "/audio/ui/game-launch.ogg";
const ERROR_OVERLAY_SRC = "/audio/ui/error-overlay.ogg";

const audioCache = new Map<string, HTMLAudioElement>();
const lastPlayedAt = new Map<string, number>();
const DEFAULT_SOUND_COOLDOWN_MS = 60;
const ERROR_OVERLAY_COOLDOWN_MS = 300;

function getAudio(src: string) {
  if (typeof window === "undefined") return null;
  let audio = audioCache.get(src);
  if (!audio) {
    audio = new Audio(src);
    audio.preload = "auto";
    audioCache.set(src, audio);
  }
  return audio;
}

function play(src: string) {
  if (!areLauncherSoundsEnabled()) return;
  const base = getAudio(src);
  if (!base) return;
  const instance = base.cloneNode() as HTMLAudioElement;
  instance.volume = 0.9;
  void instance.play().catch(() => {});
}

function playWithCooldown(src: string, cooldownMs: number) {
  const now = Date.now();
  const lastPlayed = lastPlayedAt.get(src) ?? 0;
  if (now - lastPlayed < cooldownMs) {
    return;
  }
  lastPlayedAt.set(src, now);
  play(src);
}

export function playSettingsHover() {
  playWithCooldown(HOVER_SRC, DEFAULT_SOUND_COOLDOWN_MS);
}

export function playSettingsClick() {
  playWithCooldown(CLICK_SRC, DEFAULT_SOUND_COOLDOWN_MS);
}

export function playNavHover() {
  playWithCooldown(NAV_HOVER_SRC, DEFAULT_SOUND_COOLDOWN_MS);
}

export function playNavClick() {
  playWithCooldown(NAV_CLICK_SRC, DEFAULT_SOUND_COOLDOWN_MS);
}

export function playUtilityHover() {
  playWithCooldown(UTILITY_HOVER_SRC, DEFAULT_SOUND_COOLDOWN_MS);
}

export function playGameLaunch() {
  playWithCooldown(GAME_LAUNCH_SRC, DEFAULT_SOUND_COOLDOWN_MS);
}

export function playErrorOverlay() {
  playWithCooldown(ERROR_OVERLAY_SRC, ERROR_OVERLAY_COOLDOWN_MS);
}
