import { ASSETS } from "../../../config/assets";
import { playSettingsClick, playSettingsHover } from "../../../lib/uiSound";
import { Img } from "../media/Img";

export function Stepper<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const idx = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const cur = options[idx] ?? options[0];
  const go = (d: number) =>
    onChange(options[(idx + d + options.length) % options.length].value);
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => go(-1)}
        onMouseEnter={playSettingsHover}
        onMouseDown={playSettingsClick}
        className="grid h-9 w-8 place-items-center border border-white/20 bg-black/30 text-ink-dim transition-colors hover:border-white/20 hover:bg-white/10 hover:text-ink"
        aria-label="Previous"
      >
        <Img
          src={ASSETS.arrow}
          alt=""
          className="h-[18px] w-[18px] rotate-90 object-contain opacity-70"
        />
      </button>
      <div className="relative flex h-9 flex-1 items-center justify-center border-y border-white/10 bg-black/30 px-2">
        <span className="truncate font-cond text-[13px] uppercase tracking-[0.04em] text-ink">
          {cur.label}
        </span>
        <div className="absolute inset-x-2 bottom-[2px] flex items-center gap-1">
          {options.map((option) => {
            const active = option.value === cur.value;
            return (
              <span
                key={String(option.value)}
                className={`h-[2px] flex-1 ${active ? "bg-red" : "bg-white/14"}`}
                aria-hidden="true"
              />
            );
          })}
        </div>
      </div>
      <button
        onClick={() => go(1)}
        onMouseEnter={playSettingsHover}
        onMouseDown={playSettingsClick}
        className="grid h-9 w-8 place-items-center border border-white/20 bg-black/30 text-ink-dim transition-colors hover:border-white/20 hover:bg-white/10 hover:text-ink"
        aria-label="Next"
      >
        <Img
          src={ASSETS.arrow}
          alt=""
          className="h-[18px] w-[18px] -rotate-90 object-contain opacity-70"
        />
      </button>
    </div>
  );
}

export function TwoWay({
  checked,
  onChange,
  offLabel = "Disabled",
  onLabel = "Enabled",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  offLabel?: string;
  onLabel?: string;
}) {
  const opts: { l: string; v: boolean }[] = [
    { l: offLabel, v: false },
    { l: onLabel, v: true },
  ];
  return (
    <div className="grid grid-cols-2 gap-1">
      {opts.map((o) => {
        const on = o.v === checked;
        return (
          <button
            key={o.l}
            onClick={() => onChange(o.v)}
            onMouseEnter={playSettingsHover}
            onMouseDown={playSettingsClick}
            className={`relative h-9 border border-white/20 font-cond text-[12px] uppercase tracking-[0.06em] transition-colors ${
              on
                ? "bg-black/30 text-ink hover:bg-white/10"
                : "bg-black/30 text-ink-mute hover:border-white/20 hover:bg-white/10 hover:text-ink-dim"
            }`}
          >
            {o.l}
            {on && <span className="absolute bottom-0 left-0 h-[2px] w-full bg-red" />}
          </button>
        );
      })}
    </div>
  );
}

export function Choice<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={String(o.value)}
            onClick={() => onChange(o.value)}
            onMouseEnter={playSettingsHover}
            onMouseDown={playSettingsClick}
            className={`relative h-9 border border-white/20 font-cond text-[12px] uppercase tracking-[0.06em] transition-colors ${
              on
                ? "bg-black/30 text-ink hover:bg-white/10"
                : "bg-black/30 text-ink-mute hover:border-white/20 hover:bg-white/10 hover:text-ink-dim"
            }`}
          >
            {o.label}
            {on && <span className="absolute bottom-0 left-0 h-[2px] w-full bg-red" />}
          </button>
        );
      })}
    </div>
  );
}

export function StepSlider({
  value,
  min,
  max,
  step = 1,
  onChange,
  display,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  display?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const markerLeft = `calc(${pct}% - 2px)`;
  return (
    <div className="flex items-center gap-3">
      <div className="hud-range-shell relative flex-1">
        <div className="pointer-events-none absolute inset-[0px] overflow-hidden border border-white/6 bg-[#2e3035]">
          <span
            className="absolute inset-y-0 left-0 bg-[#b9b9b9]"
            style={{ width: `${pct}%` }}
          />
          <span
            className="absolute inset-y-0 w-[4px] bg-[#ff5a2f]"
            style={{ left: markerLeft }}
          />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onMouseEnter={playSettingsHover}
          onMouseDown={playSettingsClick}
          className="hud-range"
        />
      </div>
      <span className="grid h-8 w-16 shrink-0 place-items-center border border-white/0 bg-black/0 font-mono text-[14px] text-ink/70">
        {display ?? value}
      </span>
    </div>
  );
}

export function RowText({
  value,
  onChange,
  placeholder,
  type = "text",
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onMouseEnter={playSettingsHover}
      onMouseDown={playSettingsClick}
      className={`h-9 w-full border border-white/10 bg-black/30 px-3 font-cond text-[13px] uppercase tracking-[0.03em] text-ink outline-none transition-colors focus:border-red placeholder:text-ink-mute ${
        mono ? "font-mono text-[12px]" : ""
      }`}
    />
  );
}
