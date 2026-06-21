import { useState } from "react";

/**
 * <img> that removes itself if the source is missing, so empty art slots
 * fall back to whatever sits behind them instead of a broken-image icon.
 */
export function Img({
  src,
  alt = "",
  className,
  style,
}: {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;

  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      onError={() => setOk(false)}
      className={className}
      style={style}
    />
  );
}
