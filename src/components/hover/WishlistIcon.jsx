import HoverIcon from "@/components/hover/HoverIcon";

/**
 * 收藏愛心 — 統一使用 /images/icon/收藏.png（已收藏用紅色愛心）。
 */
export default function WishlistIcon({
  active = false,
  size = 52,
  className = "",
}) {
  return (
    <HoverIcon
      name={active ? "favoriteActive" : "favorite"}
      size={size}
      className={className}
      alt={active ? "已收藏" : "收藏"}
    />
  );
}
