import HoverIcon from "@/components/hover/HoverIcon";

export default function WishlistIcon({ active = false, size = 52, className = "" }) {
  return (
    <HoverIcon
      name={active ? "favoriteActive" : "favorite"}
      size={size}
      className={className}
      alt={active ? "已收藏" : "收藏"}
    />
  );
}
