import { formatProductPrice } from "@/lib/utils";
import { formatDiscountAmount } from "@/lib/orderSummary";

/**
 * 購物袋／結帳／訂單明細共用金額列
 * 順序：商品總金額 → 折扣 → 運費 → 免運優惠 → 總金額
 */
export default function OrderSummaryRows({
  summary,
  totalLabel = "總金額",
  labelClassName = "text-black",
  valueClassName = "text-black",
  discountLabelClassName = "text-black",
  discountValueClassName = "text-[#c90000]",
  freeShipLabelClassName,
  freeShipValueClassName = "text-[#2a514d]",
  totalLabelClassName = "text-[15px] font-semibold text-black",
  totalValueClassName = "text-[18px] font-bold text-black",
  rowClassName = "flex items-center justify-between gap-3",
  containerClassName = "space-y-3 text-[14px]",
  showTotalDivider = true,
  totalRowClassName = "flex items-center justify-between",
}) {
  if (!summary) return null;
  const freeShipLabel = freeShipLabelClassName || labelClassName;

  return (
    <>
      <div className={containerClassName}>
        <div className={rowClassName}>
          <span className={labelClassName}>商品總金額</span>
          <span className={valueClassName}>
            {formatProductPrice(summary.subtotal)}
          </span>
        </div>

        {summary.discountRows.map((row, i) => (
          <div key={`disc-${i}`} className={rowClassName}>
            <span className={`min-w-0 ${discountLabelClassName}`}>
              {row.label}
            </span>
            <span className={`shrink-0 ${discountValueClassName}`}>
              {formatDiscountAmount(row.amount)}
            </span>
          </div>
        ))}

        <div className={rowClassName}>
          <span className={labelClassName}>運費</span>
          <span className={valueClassName}>
            {formatProductPrice(summary.shippingFee)}
          </span>
        </div>

        {summary.freeShippingDiscount > 0 ? (
          <div className={rowClassName}>
            <span className={freeShipLabel}>免運優惠</span>
            <span className={`shrink-0 ${freeShipValueClassName}`}>
              {formatDiscountAmount(summary.freeShippingDiscount)}
            </span>
          </div>
        ) : null}
      </div>

      {showTotalDivider ? (
        <div className="my-4 border-t border-[#e8e8e8]" />
      ) : null}

      <div className={totalRowClassName}>
        <span className={totalLabelClassName}>{totalLabel}</span>
        <span className={totalValueClassName}>
          {formatProductPrice(summary.total)}
        </span>
      </div>
    </>
  );
}
