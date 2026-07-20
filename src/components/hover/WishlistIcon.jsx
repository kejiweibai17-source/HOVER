/**
 * 統一尺寸的收藏愛心（SVG）。
 * 勿再使用紅色愛心 PNG：該素材畫布過大、圖形偏小，object-contain 後會看起來縮小。
 */
export default function WishlistIcon({
  active = false,
  size = 52,
  className = "",
}) {
  const color = active ? "#e11d48" : "currentColor";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={active ? color : "none"}
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label={active ? "已收藏" : "收藏"}
    >
      <path
        d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
