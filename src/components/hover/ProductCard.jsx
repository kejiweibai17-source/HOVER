import Image from "next/image";
import { Link } from "next-view-transitions";

export default function ProductCard({
  href = "#",
  category,
  name,
  image,
  colors = [],
  originalPrice,
  salePrice,
  soldOut = false,
}) {
  return (
    <div className="group flex min-w-0 flex-col">
      <Link href={href} className="relative block aspect-[404/479] overflow-hidden bg-neutral-200">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 80vw, 25vw"
        />
      </Link>

      <div className="mt-4 space-y-1">
        <p className="text-[14px] text-black">{category}</p>
        <Link href={href} className="block text-[16px] font-semibold text-black hover:opacity-70">
          {name}
        </Link>

        {colors.length > 0 && (
          <div className="flex items-center gap-2 pt-1">
            {colors.map((color) => (
              <div key={color.label} className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-3 w-3 rounded-full border border-neutral-300 ${color.active ? "ring-1 ring-neutral-400 ring-offset-1" : ""}`}
                  style={{ backgroundColor: color.hex || "#4a6fa5" }}
                />
                <span className="text-[13px] text-[#717171]">{color.label}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center gap-4 pt-1">
          {soldOut ? (
            <span className="text-[14px] font-extrabold text-[#252525]">SOLD OUT</span>
          ) : (
            <>
              {originalPrice && (
                <span className="text-[14px] text-[#b3b3b3] line-through">NT. {originalPrice}</span>
              )}
              {salePrice && (
                <span className="text-[14px] font-extrabold text-[#252525]">NT. {salePrice}</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
