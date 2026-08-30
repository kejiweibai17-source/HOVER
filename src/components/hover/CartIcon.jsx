import HoverIcon from "@/components/hover/HoverIcon";

export default function CartIcon({ count = 0, size = 48, className = "" }) {
  const display = count > 99 ? "99+" : String(count);
  const fontSize = size >= 56 ? 11 : size >= 52 ? 10 : size >= 48 ? 9 : size >= 32 ? 8 : 7;

  return (
    <span
      className={`relative inline-flex shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <HoverIcon name="cart" size={size} alt="購物車" />
      {count > 0 && (
        <span
          className="pointer-events-none absolute left-1/2 top-[38%] flex h-[48%] w-[72%] -translate-x-1/2 items-center justify-center font-bold leading-none tabular-nums text-[#2a514d]"
          style={{ fontSize }}
          aria-hidden
        >
          {display}
        </span>
      )}
    </span>
  );
}
