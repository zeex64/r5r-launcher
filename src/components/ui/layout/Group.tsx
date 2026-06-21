import type { ReactNode } from "react";

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-1.5 flex items-center gap-3 px-1">
        <h3 className="font-display text-[14px] font-bold uppercase tracking-[0.16em] text-white/84">
          {title}
        </h3>
        <span className="h-px flex-1 bg-white/12" />
      </div>
      <div className="flex flex-col gap-1">{children}</div>
    </section>
  );
}
