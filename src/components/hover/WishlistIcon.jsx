import HoverIcon from "@/components/hover/HoverIcon";

/**
 * 收藏愛心 — /images/icon/收藏.png（線框）／紅色愛心收藏.png（已收藏）
 *
 * 紅色愛心素材留白很大，若用相同 size 會看起來變小。
 * 外框固定為 size，已收藏時放大圖檔以對齊線框視覺大小。
 */
const ACTIVE_OPTICAL_SCALE = 2.65;

export default function WishlistIcon({
  active = false,
  size = 52,
  className = "",
}) {
  if (!active) {
    return (
      <HoverIcon
        name="favorite"
        size={size}
        className={className}
        alt="收藏"
      />
    );
  }

  const imgSize = Math.round(size * ACTIVE_OPTICAL_SCALE);

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-visible ${className}`}
      style={{ width: size, height: size }}
      aria-hidden={false}
    >
      <HoverIcon name="favoriteActive" size={imgSize} alt="已收藏" />
    </span>
  );
}
