import Image from "next/image";
import { Link } from "next-view-transitions";
import { formatProductPrice } from "@/lib/utils";

export default function ProductCard({
  href = "#",
  name,
  image,
  colors = [],
  originalPrice,
  salePrice,
  soldOut = false,
}) {
  const price = salePrice || originalPrice;

  return (
    <div className="group flex min-w-0 flex-col">
      <Link href={href} className="relative block aspect-[3/4] overflow-hidden bg-white">
        <Image
          src={image}
          alt={name}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 80vw, 25vw"
        />
      </Link>

      <div className="mt-2 min-w-0 space-y-1 px-0.5 text-left md:mt-3">
        <Link
          href={href}
          className="block break-words text-[12px] font-semibold leading-snug text-black line-clamp-2 hover:opacity-60 md:text-[13px]"
        >
          {name}
        </Link>

        {colors.length > 0 && (
          <div className="flex items-center gap-1.5 pt-0.5">
            {colors.map((color) => (
              <span
                key={color.label}
                className={`inline-block h-3 w-3 shrink-0 rounded-full border border-[#ccc] ${
                  color.active ? "ring-1 ring-neutral-400 ring-offset-1" : ""
                }`}
                style={{ backgroundColor: color.hex || "#4a6fa5" }}
                title={color.label}
              />
            ))}
          </div>
        )}

        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-0.5">
          {price && (
            <span
              className={`text-[12px] font-bold text-[#222] md:text-[13px] ${
                soldOut ? "line-through" : ""
              }`}
            >
              {formatProductPrice(price)}
            </span>
          )}
          {soldOut && (
            <span className="text-[12px] font-bold text-[#222] md:text-[13px]">
              SOLD OUT
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
