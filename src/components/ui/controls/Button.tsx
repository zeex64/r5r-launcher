import type { ReactNode } from "react";
import { playSettingsClick, playSettingsHover } from "../../../lib/uiSound";

export function Button({
  children,
  onClick,
  variant = "ghost",
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "ghost" | "danger" | "primary";
  disabled?: boolean;
  className?: string;
}) {
  const styles = {
    ghost:
      "border-white/10 bg-black/30 text-ink-dim hover:border-white/20 hover:text-ink",
    danger:
      "border-red/35 bg-red/10 text-[#ff8a73] hover:border-red hover:bg-red/18",
    primary: "border-red/60 bg-red/20 text-ink hover:bg-red/30",
  }[variant];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => !disabled && playSettingsHover()}
      onMouseDown={() => !disabled && playSettingsClick()}
      className={`flex h-9 items-center gap-2 border px-4 font-cond text-[12px] uppercase tracking-[0.06em] transition-colors ${styles} ${
        disabled ? "pointer-events-none opacity-40" : ""
      } ${className}`}
    >
      {children}
    </button>
  );
}
