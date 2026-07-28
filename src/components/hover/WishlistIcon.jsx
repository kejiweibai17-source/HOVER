import HoverIcon from "@/components/hover/HoverIcon";

/**
 * 收藏愛心 — /images/icon/收藏.png（線框）／紅色愛心收藏.png（已收藏）
 * 兩張素材已對齊留白，active / inactive 使用相同 size。
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
