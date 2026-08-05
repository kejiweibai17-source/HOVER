import {
  getMaxOrderQty,
  parseWooStock,
  STOCK_INSUFFICIENT_MSG,
  STOCK_SOLD_OUT_MSG,
  type ProductStock,
} from "@/lib/productStock";

export type StockLineInput = {
  wcProductId?: number;
  wcVariationId?: number;
  id?: string | number;
  qty: number;
  title?: string;
  name?: string;
};

export type StockCheckResult = {
  productId: number;
  variationId: number | null;
  stock: ProductStock;
  maxQty: number | null;
  requestedQty: number;
  ok: boolean;
};

async function fetchProductOrVariation(
  base: string,
  auth: string,
  productId: number,
  variationId: number | null,
): Promise<any | null> {
  const root = base.replace(/\/$/, "");
  const url = variationId
    ? `${root}/wp-json/wc/v3/products/${productId}/variations/${variationId}`
    : `${root}/wp-json/wc/v3/products/${productId}`;
  const res = await fetch(url, {
    headers: { Authorization: auth },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

export async function checkCartStock(
  base: string,
  auth: string,
  items: StockLineInput[],
): Promise<{
  ok: boolean;
  message?: string;
  results: StockCheckResult[];
}> {
  // 合併同商品／變體數量
  const groups = new Map<
    string,
    { productId: number; variationId: number | null; qty: number; name: string }
  >();

  for (const item of items) {
    const productId = Number(item.wcProductId || item.id);
    if (!productId) continue;
    const variationId = item.wcVariationId
      ? Number(item.wcVariationId)
      : null;
    const key = `${productId}:${variationId || 0}`;
    const prev = groups.get(key);
    const name = String(item.title || item.name || "商品");
    if (prev) {
      prev.qty += Number(item.qty) || 0;
    } else {
      groups.set(key, {
        productId,
        variationId,
        qty: Number(item.qty) || 0,
        name,
      });
    }
  }

  const results: StockCheckResult[] = [];

  for (const group of Array.from(groups.values())) {
    const raw = await fetchProductOrVariation(
      base,
      auth,
      group.productId,
      group.variationId,
    );
    if (!raw) {
      return {
        ok: false,
        message: `無法確認「${group.name}」庫存，請稍後再試`,
        results,
      };
    }

    const stock = parseWooStock(raw);
    const maxQty = getMaxOrderQty(stock);
    const ok =
      maxQty === null
        ? group.qty > 0
        : group.qty > 0 && group.qty <= maxQty;

    results.push({
      productId: group.productId,
      variationId: group.variationId,
      stock,
      maxQty,
      requestedQty: group.qty,
      ok,
    });

    if (!ok) {
      if (maxQty === 0) {
        return {
          ok: false,
          message: `「${group.name}」${STOCK_SOLD_OUT_MSG}`,
          results,
        };
      }
      return {
        ok: false,
        message: `「${group.name}」${STOCK_INSUFFICIENT_MSG}（目前庫存 ${maxQty}）`,
        results,
      };
    }
  }

  return { ok: true, results };
}
