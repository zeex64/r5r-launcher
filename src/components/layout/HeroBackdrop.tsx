import { useEffect, useState } from "react";
import { ASSETS } from "../../config/assets";
import {
  LAUNCHER_SETTINGS_CHANGED_EVENT,
  loadLauncherSettings,
} from "../../lib/launcherSettings";
import { Img } from "../ui/media/Img";

export default function HeroBackdrop() {
  const [backgroundVideoEnabled, setBackgroundVideoEnabled] = useState(
    () => loadLauncherSettings().backgroundVideoEnabled,
  );
  const [videoFailed, setVideoFailed] = useState(false);

  useEffect(() => {
    const handleLauncherSettingsChanged = (
      event: Event,
    ) => {
      const detail = (event as CustomEvent<{ backgroundVideoEnabled?: boolean }>).detail;
      const nextVideoEnabled =
        typeof detail?.backgroundVideoEnabled === "boolean"
          ? detail.backgroundVideoEnabled
          : loadLauncherSettings().backgroundVideoEnabled;
      setBackgroundVideoEnabled(nextVideoEnabled);
      setVideoFailed(false);
    };

    window.addEventListener(
      LAUNCHER_SETTINGS_CHANGED_EVENT,
      handleLauncherSettingsChanged,
    );

    return () => {
      window.removeEventListener(
        LAUNCHER_SETTINGS_CHANGED_EVENT,
        handleLauncherSettingsChanged,
      );
    };
  }, []);

  const showFallbackImage = !backgroundVideoEnabled || videoFailed;

  return (
    <div className="absolute inset-0 overflow-hidden bg-base">
      <div className="absolute inset-0 bg-black" />
      {showFallbackImage ? (
        <Img
          src={ASSETS.background}
          className="absolute inset-0 h-full w-full object-cover fade-in"
        />
      ) : null}
      {backgroundVideoEnabled && (
        <video
          className="absolute inset-0 h-full w-full object-cover fade-in"
          src={ASSETS.backgroundVideo}
          autoPlay
          muted
          loop
          playsInline
          onError={() => setVideoFailed(true)}
        />
      )}
      {backgroundVideoEnabled && (
        <div className="absolute inset-0 bg-black/10" />
      )}

      <div className="vignette pointer-events-none absolute inset-0" />
    </div>
  );
}
