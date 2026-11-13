import Image from "next/image";
import { Link } from "next-view-transitions";
import ProductImageFrame from "@/components/hover/ProductImageFrame";
import ColorSwatch from "@/components/hover/ColorSwatch";
import ProductCardPrice from "@/components/hover/ProductCardPrice";

export default function ProductCard({
  href = "#",
  name,
  image,
  colors = [],
  originalPrice,
  salePrice,
  soldOut = false,
}) {
  return (
    <div className="group flex min-w-0 flex-col">
      <ProductImageFrame as={Link} href={href} className="block">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover object-center"
          sizes="(max-width: 768px) 80vw, 25vw"
        />
      </ProductImageFrame>

      <div className="mt-1.5 flex min-w-0 flex-col gap-1.5 px-0.5 text-left md:mt-2">
        <Link
          href={href}
          className="block break-words text-[12px] font-semibold leading-snug text-black line-clamp-2 hover:opacity-60 md:text-[13px]"
        >
          {name}
        </Link>

        {colors.length > 0 && (
          <div className="flex items-center gap-1.5">
            {colors.map((color) => (
              <ColorSwatch
                key={color.label}
                label={color.label}
                hex={color.hex}
                hexes={color.hexes}
                title={color.label}
                className={`inline-block h-3 w-3 shrink-0 rounded-full border border-[#ccc] ${
                  color.active ? "ring-1 ring-neutral-400 ring-offset-1" : ""
                }`}
              />
            ))}
          </div>
        )}

        <ProductCardPrice
          originalPrice={originalPrice}
          salePrice={salePrice}
          soldOut={soldOut}
          className="text-[12px] font-bold md:text-[13px]"
        />
      </div>
    </div>
  );
}
