import { useEffect, useRef, useState } from "react";
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

export function Select({
  value,
  options,
  onChange,
  placeholder = "Select an option",
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        onMouseEnter={playSettingsHover}
        onMouseDown={playSettingsClick}
        className={`relative h-9 w-full border border-white/20 bg-black/30 pl-3 pr-10 text-left font-cond text-[13px] uppercase tracking-[0.04em] text-ink outline-none transition-colors hover:border-white/20 hover:bg-white/10 ${
          open ? "bg-white/10" : ""
        }`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="block truncate">{selectedOption?.label ?? placeholder}</span>
      </button>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex w-9 items-center justify-center border-l border-white/10 bg-black/20">
        <Img
          src={ASSETS.arrow}
          alt=""
          className={`h-[18px] w-[18px] object-contain opacity-70 transition-transform ${
            open ? "rotate-180" : "rotate-0"
          }`}
        />
      </div>

      {open ? (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 border border-white/14 bg-[#2f3137] p-1 shadow-[0_12px_30px_rgba(0,0,0,0.45)]">
          <div className="max-h-64 overflow-y-auto">
            {options.map((option) => {
              const active = option.value === value;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                  onMouseEnter={playSettingsHover}
                  onMouseDown={playSettingsClick}
                  className={`relative flex h-9 w-full items-center px-3 text-left font-cond text-[13px] uppercase tracking-[0.04em] transition-colors ${
                    active
                      ? "bg-white/12 text-ink"
                      : "text-ink/80 hover:bg-white/8 hover:text-ink"
                  }`}
                  role="option"
                  aria-selected={active}
                >
                  <span className="block truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
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
  const markerLeft = `calc(${pct}% - 8px)`;
  return (
    <div className="flex items-center">
      <div className="hud-range-shell relative flex-1 overflow-hidden">
        <div className="pointer-events-none absolute inset-[0px] overflow-hidden">
          <span
            className="absolute inset-y-0 left-0 bg-white/70"
            style={{ width: `${pct}%` }}
          />
          <span
            className="absolute inset-y-0 w-[16px] bg-[#ff5a2f]"
            style={{ left: markerLeft }}
          />
          {display ? (
            <span className="absolute inset-y-[3px] left-3 flex items-center bg-black/60 px-2 font-mono text-[12px] text-white/88">
              {display}
            </span>
          ) : null}
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
