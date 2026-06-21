import type { ReactNode } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { playSettingsClick, playUtilityHover } from "../../../lib/uiSound";

type UtilityButtonProps = {
  "aria-label": string;
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export default function UtilityButton({
  "aria-label": ariaLabel,
  children,
  href,
  onClick,
  disabled = false,
}: UtilityButtonProps) {
  const handleClick = () => {
    if (disabled) {
      return;
    }
    if (onClick) {
      onClick();
      return;
    }
    if (href) {
      void openUrl(href);
    }
  };

  return (
    <button
      aria-label={ariaLabel}
      className={`utility-button-apex group relative grid h-[54px] w-[54px] place-items-center overflow-hidden text-white/88 transition-transform duration-150 hover:-translate-y-px hover:text-white ${
        disabled ? "cursor-default opacity-70" : ""
      }`}
      onClick={handleClick}
      onMouseEnter={() => !disabled && playUtilityHover()}
      onMouseDown={() => !disabled && playSettingsClick()}
      disabled={disabled}
      type="button"
    >
      <span className="utility-button-apex__bg" />
      <span className="utility-button-apex__frame" />
      <span className="utility-button-apex__shine" />
      <span className="relative z-10">{children}</span>
    </button>
  );
}
