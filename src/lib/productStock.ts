/** WooCommerce 庫存欄位（商品／變體共用） */

export type StockStatus = "instock" | "outofstock" | "onbackorder" | string;
export type Backorders = "no" | "notify" | "yes" | string;

export type ProductStock = {
  manageStock: boolean;
  /** null = 未管理數量或不適用 */
  stockQuantity: number | null;
  stockStatus: StockStatus;
  /** no = 禁止無庫存下單（不允許預購） */
  backorders: Backorders;
  purchasable: boolean;
};

export const STOCK_INSUFFICIENT_MSG = "庫存不足，無法加入更多數量";
export const STOCK_SOLD_OUT_MSG = "此商品目前無庫存";

export function parseWooStock(raw: {
  manage_stock?: boolean | string;
  stock_quantity?: number | string | null;
  stock_status?: string;
  backorders?: string;
  purchasable?: boolean;
} | null | undefined): ProductStock {
  const manageStock =
    raw?.manage_stock === true ||
    raw?.manage_stock === "true" ||
    raw?.manage_stock === "yes";

  const qtyRaw = raw?.stock_quantity;
  let stockQuantity: number | null = null;
  if (qtyRaw !== undefined && qtyRaw !== null && qtyRaw !== "") {
    const n = Number(qtyRaw);
    stockQuantity = Number.isFinite(n) ? n : null;
  }

  const stockStatus = String(raw?.stock_status || "instock").toLowerCase();
  const backorders = String(raw?.backorders || "no").toLowerCase();
  const purchasable =
    raw?.purchasable === undefined ? true : Boolean(raw.purchasable);

  return {
    manageStock,
    stockQuantity,
    stockStatus,
    backorders,
    purchasable,
  };
}

/**
 * 可下單上限。
 * - `null`：不限量（未管庫存，或允許預購）
 * - `0`：不可購買（缺貨且禁止無庫存下單）
 */
export function getMaxOrderQty(
  stock: ProductStock | null | undefined,
): number | null {
  if (!stock) return null;

  if (stock.purchasable === false) return 0;

  const allowsBackorder =
    stock.backorders === "yes" || stock.backorders === "notify";

  if (stock.stockStatus === "outofstock" && !allowsBackorder) return 0;

  if (!stock.manageStock) {
    return stock.stockStatus === "outofstock" ? 0 : null;
  }

  // 管理庫存 + 允許預購 → 不限量
  if (allowsBackorder) return null;

  // 管理庫存 + 禁止無庫存下單 → 上限 = 庫存量
  if (stock.stockQuantity == null) {
    return stock.stockStatus === "instock" || stock.stockStatus === "onbackorder"
      ? null
      : 0;
  }

  return Math.max(0, Math.floor(stock.stockQuantity));
}

export function isInStock(stock: ProductStock | null | undefined): boolean {
  const max = getMaxOrderQty(stock);
  return max === null || max > 0;
}

/** 把想加的數量壓在「庫存 − 購物車已有」之內 */
export function clampAddQty(
  desiredQty: number,
  stock: ProductStock | null | undefined,
  alreadyInCart = 0,
): { qty: number; limited: boolean; max: number | null; remaining: number } {
  const want = Math.max(0, Math.floor(Number(desiredQty) || 0));
  const max = getMaxOrderQty(stock);

  if (max === null) {
    return {
      qty: Math.max(1, want),
      limited: false,
      max: null,
      remaining: Number.POSITIVE_INFINITY,
    };
  }

  const remaining = Math.max(0, max - Math.max(0, alreadyInCart));
  const qty = Math.min(want, remaining);
  return {
    qty,
    limited: want > remaining,
    max,
    remaining,
  };
}

export function stockFromCartFields(item: {
  manageStock?: boolean;
  stockQuantity?: number | null;
  stockStatus?: string;
  backorders?: string;
  maxQty?: number | null;
}): ProductStock | null {
  // 舊購物車只有 maxQty 快照時，還原成可判斷的 stock
  if (
    item.manageStock === undefined &&
    item.stockStatus === undefined &&
    item.maxQty !== undefined
  ) {
    if (item.maxQty === null) {
      return {
        manageStock: false,
        stockQuantity: null,
        stockStatus: "instock",
        backorders: "no",
        purchasable: true,
      };
    }
    return {
      manageStock: true,
      stockQuantity: item.maxQty,
      stockStatus: item.maxQty > 0 ? "instock" : "outofstock",
      backorders: "no",
      purchasable: item.maxQty > 0,
    };
  }

  if (
    item.manageStock === undefined &&
    item.stockStatus === undefined &&
    item.stockQuantity === undefined
  ) {
    return null;
  }

  return {
    manageStock: Boolean(item.manageStock),
    stockQuantity:
      item.stockQuantity === undefined || item.stockQuantity === null
        ? null
        : Number(item.stockQuantity),
    stockStatus: String(item.stockStatus || "instock"),
    backorders: String(item.backorders || "no"),
    purchasable: true,
  };
}
