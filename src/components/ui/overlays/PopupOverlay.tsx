import { useEffect, type ReactNode } from "react";
import { ASSETS } from "../../../config/assets";
import {
  playErrorOverlay,
  playSettingsClick,
  playSettingsHover,
} from "../../../lib/uiSound";
import { Img } from "../media/Img";

export default function PopupOverlay({
  title = "Error",
  message,
  confirmLabel = "Continue",
  confirmDisabled = false,
  cancelLabel,
  onConfirm,
  onDismiss,
  children,
  showIcon = true,
  childrenFullWidth = false,
  childrenPosition = "body",
  confirmPlacement = "footer",
  confirmCompact = false,
}: {
  title?: string;
  message: string;
  confirmLabel?: string;
  confirmDisabled?: boolean;
  cancelLabel?: string;
  onConfirm?: () => void;
  onDismiss: () => void;
  children?: ReactNode;
  showIcon?: boolean;
  childrenFullWidth?: boolean;
  childrenPosition?: "body" | "bottom";
  confirmPlacement?: "footer" | "top-right";
  confirmCompact?: boolean;
}) {
  useEffect(() => {
    playErrorOverlay();
  }, []);

  const handleAction = () => {
    if (onConfirm) {
      onConfirm();
      return;
    }
    onDismiss();
  };

  const bodyChildren =
    children && childrenPosition === "body" ? (
      <div className={childrenFullWidth ? "mt-6 w-full" : "mt-6 w-full max-w-[720px]"}>{children}</div>
    ) : null;
  const bottomChildren =
    children && childrenPosition === "bottom" ? (
      <div className={childrenFullWidth ? "mt-auto w-full" : "mt-auto w-full max-w-[720px]"}>
        {children}
      </div>
    ) : null;
  const showFooterActions = cancelLabel || confirmPlacement === "footer";
  const confirmButtonClass = confirmCompact
    ? `group relative inline-flex h-[42px] min-w-[124px] items-center justify-center overflow-hidden border border-white/70 bg-black/20 px-5 font-display text-[14px] font-semibold uppercase tracking-[0.08em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_14px_rgba(255,255,255,0.04)] transition-[border-color,box-shadow,color] duration-150 ${
        confirmDisabled ? "cursor-default opacity-75" : "hover:border-[#ff7a52] hover:text-white"
      }`
    : `group relative inline-flex h-[54px] min-w-[190px] items-center justify-center overflow-hidden border border-white/85 bg-white/0 px-8 font-display text-[18px] font-semibold uppercase tracking-[0.08em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.32),0_0_18px_rgba(255,255,255,0.08)] transition-[border-color,box-shadow,background-color] duration-150 ${
        confirmDisabled ? "cursor-default opacity-75" : "hover:border-[#ff7a52] hover:bg-white/0"
      }`;
  const confirmGlowClass = confirmCompact
    ? "absolute inset-x-0 bottom-0 h-[32px] bg-[linear-gradient(rgba(255,255,255,0)_0%,rgba(255,255,255,0.12)_55%,rgba(255,255,255,0.55)_100%)] opacity-80 blur-[1px] transition-opacity duration-150 group-hover:bg-[linear-gradient(rgba(255,122,82,0)_0%,rgba(255,122,82,0.14)_55%,rgba(255,122,82,0.85)_100%)] group-hover:opacity-100"
    : "absolute inset-x-0 bottom-0 h-[50px] bg-[linear-gradient(rgba(255,255,255,0)_0%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,1)_100%)] opacity-85 blur-[1px] transition-opacity duration-150 group-hover:bg-[linear-gradient(rgba(255,122,82,0)_0%,rgba(255,122,82,0.2)_50%,rgba(255,122,82,1.0)_100%)] group-hover:opacity-100";

  function OverlayActionButton({
    label,
    onClick,
    disabled = false,
    className,
    glowClass,
  }: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    className: string;
    glowClass: string;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={playSettingsHover}
        onMouseDown={playSettingsClick}
        disabled={disabled}
        className={className}
      >
        <span className={glowClass} />
        <span className="relative z-10">{label}</span>
      </button>
    );
  }

  return (
    <div className="absolute inset-0 z-[120] flex items-center justify-center bg-[rgba(6,7,10,0.68)] backdrop-blur-[2px]">
      <div className="relative w-full overflow-hidden border border-white/18 bg-[#545454] shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
        <div className="absolute inset-0" />
        <Img
          src={ASSETS.errorBg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        {confirmPlacement === "top-right" ? (
          <div className="absolute right-8 top-8 z-20">
            <OverlayActionButton
              label={confirmLabel}
              onClick={handleAction}
              disabled={confirmDisabled}
              className={confirmButtonClass}
              glowClass={confirmGlowClass}
            />
          </div>
        ) : null}
        <div className="relative z-10 flex min-h-[420px] flex-col items-center justify-between px-10 py-8 text-center text-legible">
          <div className="flex w-full flex-col items-center">
            {showIcon ? (
              <Img
                src={ASSETS.errorIcon}
                alt=""
                className="h-[58px] w-[58px] object-contain"
              />
            ) : null}
            <h2 className="mt-3 font-display text-[42px] font-bold uppercase leading-none tracking-[0.05em] text-white">
              {title}
            </h2>
            <p className="mt-4 max-w-[620px] whitespace-pre-line font-ui text-[18px] leading-7 text-white/82">
              {message}
            </p>
            {bodyChildren}
          </div>

          {bottomChildren}

          {showFooterActions ? (
            <div className="flex flex-wrap items-center justify-center gap-4">
              {cancelLabel && (
                <OverlayActionButton
                  label={cancelLabel}
                  onClick={onDismiss}
                  className="group relative inline-flex h-[54px] min-w-[190px] items-center justify-center overflow-hidden border border-white/45 bg-white/0 px-8 font-display text-[18px] font-semibold uppercase tracking-[0.08em] text-white/92 shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_0_14px_rgba(255,255,255,0.04)] transition-[border-color,box-shadow,color] duration-150 hover:border-white/75 hover:text-white"
                  glowClass="absolute inset-x-0 bottom-0 h-[36px] bg-[linear-gradient(rgba(255,255,255,0)_0%,rgba(255,255,255,0.1)_60%,rgba(255,255,255,0.32)_100%)] opacity-70 blur-[1px]"
                />
              )}

              {confirmPlacement === "footer" ? (
                <OverlayActionButton
                  label={confirmLabel}
                  onClick={handleAction}
                  disabled={confirmDisabled}
                  className={confirmButtonClass}
                  glowClass={confirmGlowClass}
                />
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
