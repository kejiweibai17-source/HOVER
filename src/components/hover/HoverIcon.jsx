import { HOVER_ICONS } from "@/lib/hoverIcons";

export default function HoverIcon({
  name,
  size = 52,
  className = "",
  alt = "",
}) {
  const src = HOVER_ICONS[name];
  if (!src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className={`inline-block object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
