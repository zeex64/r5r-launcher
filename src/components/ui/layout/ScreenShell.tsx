import type { ReactNode } from "react";

export function ScreenShell({
  title,
  subtitle,
  footer,
  hideHeader = false,
  children,
}: {
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  hideHeader?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[58%] bg-[linear-gradient(90deg,rgba(255,255,255,0.04),transparent_75%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[22%] bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.02)_42%,rgba(255,255,255,0.01))]" />
      <div className="relative flex h-full flex-col">
        <div className="hud-scroll flex-1 overflow-y-auto px-8 py-6">
          <div className="mx-auto max-w-5xl">
            {!hideHeader ? (
              <header className="mb-6 flex items-center gap-4 fade-up">
                <span className="h-8 w-[5px] bg-red" />
                <div>
                  <h1 className="font-display text-[34px] font-bold uppercase leading-none tracking-[0.06em] text-ink">
                    {title}
                  </h1>
                  {subtitle && (
                    <p className="mt-1 font-cond text-[11px] uppercase tracking-[0.24em] text-ink/60">
                      {subtitle}
                    </p>
                  )}
                </div>
              </header>
            ) : null}
            <div className="space-y-6 pb-6">{children}</div>
          </div>
        </div>
        {footer && (
          <div className="flex items-center justify-between border-t border-white/8 bg-black/30 px-8 py-3 backdrop-blur">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
