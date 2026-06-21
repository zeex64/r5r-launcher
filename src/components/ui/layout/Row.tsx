import type { ReactNode } from "react";
import { playSettingsHover } from "../../../lib/uiSound";

export function Row({
  label,
  hint,
  disabled,
  children,
}: {
  label: string;
  hint?: string;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      onMouseEnter={() => !disabled && playSettingsHover()}
      className={`group flex min-h-[52px] items-center gap-4 bg-[#3f3e44]/[80%] px-4 transition-colors duration-150 ${
        disabled ? "pointer-events-none opacity-40" : "hover:bg-[#4a4950]/[88%]"
      }`}
    >
      <div className="min-w-0 flex-1 py-2.5 pr-3">
        <div className="font-cond text-[15px] uppercase tracking-[0.02em] text-ink/92 transition-colors duration-150 group-hover:text-ink">
          {label}
        </div>
        {hint && (
          <div className="mt-0.5 text-[10px] uppercase tracking-[0.06em] text-ink/60 transition-colors duration-150 group-hover:text-ink/75">
            {hint}
          </div>
        )}
      </div>
      <div className="w-[250px] shrink-0 py-2">{children}</div>
    </div>
  );
}

export function FullRow({ children }: { children: ReactNode }) {
  return (
    <div
      onMouseEnter={playSettingsHover}
      className="flex min-h-[52px] flex-wrap items-center gap-2 bg-[#3f3e44]/[80%] px-4 py-2.5 transition-colors duration-150 hover:bg-[#4a4950]/[88%]"
    >
      {children}
    </div>
  );
}
