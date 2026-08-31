import { formatProductPrice } from "@/lib/utils";
import {
  baseShippingFee,
  type ShippingSettings,
} from "@/lib/shippingDefaults";

export type OrderSummaryDiscountRow = {
  label: string;
  amount: number;
};

export type OrderSummaryDisplay = {
  subtotal: number;
  discountRows: OrderSummaryDiscountRow[];
  shippingFee: number;
  freeShippingDiscount: number;
  total: number;
};

/** 折扣／免運優惠金額：-NT.168（NT. 與數字不留空白） */
export function formatDiscountAmount(amount: number): string {
  return formatProductPrice(-Math.abs(amount));
}

export function buildCartOrderSummary(params: {
  subtotal: number;
  memberDiscountAmount?: number;
  couponDiscount?: number;
  couponLabel?: string;
  shipMethod: string;
  shippingSettings: ShippingSettings;
  finalSubtotal: number;
  total: number;
}): OrderSummaryDisplay {
  const discountRows: OrderSummaryDiscountRow[] = [];
  const memberDiscount = Math.max(0, Number(params.memberDiscountAmount) || 0);
  const couponDiscount = Math.max(0, Number(params.couponDiscount) || 0);

  if (memberDiscount > 0) {
    discountRows.push({
      label: "折扣（HOVER 臻享會員 95 折）",
      amount: memberDiscount,
    });
  }
  if (couponDiscount > 0) {
    discountRows.push({
      label: params.couponLabel || "折扣",
      amount: couponDiscount,
    });
  }

  const finalSubtotal = Math.max(0, Number(params.finalSubtotal) || 0);
  const shippingFee =
    finalSubtotal > 0
      ? baseShippingFee(params.shipMethod, params.shippingSettings)
      : 0;
  const chargedShipping = Math.max(0, params.total - finalSubtotal);
  const freeShippingDiscount =
    finalSubtotal > 0 && shippingFee > 0 && chargedShipping === 0
      ? shippingFee
      : 0;

  return {
    subtotal: Math.max(0, Number(params.subtotal) || 0),
    discountRows,
    shippingFee,
    freeShippingDiscount,
    total: Math.max(0, Number(params.total) || 0),
  };
}

export function buildOrderDetailSummary(params: {
  itemsSubtotal: number;
  discountRows: OrderSummaryDiscountRow[];
  shippingTotal: number;
  orderTotal: number;
  shipMethod: string;
  shippingSettings: ShippingSettings;
}): OrderSummaryDisplay {
  const subtotal = Math.max(0, Number(params.itemsSubtotal) || 0);
  const chargedShipping = Math.max(0, Number(params.shippingTotal) || 0);
  const shippingFee =
    subtotal > 0
      ? chargedShipping > 0
        ? chargedShipping
        : baseShippingFee(params.shipMethod, params.shippingSettings)
      : 0;
  const freeShippingDiscount =
    subtotal > 0 && shippingFee > 0 && chargedShipping === 0 ? shippingFee : 0;

  return {
    subtotal,
    discountRows: params.discountRows,
    shippingFee,
    freeShippingDiscount,
    total: Math.max(0, Number(params.orderTotal) || 0),
  };
}

export function inferShipMethodFromOrder(
  shippingMethod: string,
  isCvs: boolean,
): string {
  if (isCvs || /超商|cvs|711|7-?11|全家|萊爾富|ok/i.test(shippingMethod)) {
    return "711";
  }
  return "000";
}
