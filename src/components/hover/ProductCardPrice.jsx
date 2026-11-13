import { formatProductPrice } from "@/lib/utils";

/**
 * 商品卡價格列（對齊三級／PDP）：
 * - 特價：刪線原價 + 紅色特價
 * - 售完：刪線原價 + 紅色 Sold Out
 * - 一般：單一現價
 */
export default function ProductCardPrice({
  originalPrice,
  salePrice,
  soldOut = false,
  className = "text-[14px] font-bold md:text-[15px]",
}) {
  const regular = Number(
    String(originalPrice ?? "").replace(/[^\d.-]/g, ""),
  );
  const saleRaw = Number(String(salePrice ?? "").replace(/[^\d.-]/g, ""));
  const hasSale =
    salePrice != null &&
    salePrice !== "" &&
    Number.isFinite(saleRaw) &&
    saleRaw > 0 &&
    (!Number.isFinite(regular) || regular <= 0 || saleRaw < regular);
  const sale = hasSale ? saleRaw : null;
  const current =
    sale ??
    (Number.isFinite(regular) && regular > 0
      ? regular
      : Number(String(originalPrice ?? salePrice ?? "").replace(/[^\d.-]/g, "")) ||
        0);

  if (!current && !regular) return null;

  const strikePrice =
    Number.isFinite(regular) && regular > 0 ? regular : current;

  return (
    <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
      {soldOut ? (
        <>
          <span className={`${className} text-[#222] line-through`}>
            {formatProductPrice(strikePrice)}
          </span>
          <span className={`${className} text-[#c90000]`}>Sold Out</span>
        </>
      ) : sale != null ? (
        <>
          <span className={`${className} text-[#222] line-through`}>
            {formatProductPrice(strikePrice)}
          </span>
          <span className={`${className} text-[#c90000]`}>
            {formatProductPrice(sale)}
          </span>
        </>
      ) : (
        <span className={`${className} text-[#222]`}>
          {formatProductPrice(current)}
        </span>
      )}
    </div>
  );
}
