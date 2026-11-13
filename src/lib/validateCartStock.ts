import {
  getMaxOrderQty,
  parseWooStock,
  STOCK_INSUFFICIENT_MSG,
  STOCK_SOLD_OUT_MSG,
  type ProductStock,
} from "@/lib/productStock";
import {
  extractBundleComponentsFromWooProduct,
  type BundleComponent,
} from "@/lib/productBundle";

export type StockLineInput = {
  wcProductId?: number;
  wcVariationId?: number;
  id?: string | number;
  qty: number;
  title?: string;
  name?: string;
  /** 若呼叫端已帶入組合包元件，可略過再打一次 API */
  bundleComponents?: BundleComponent[];
};

export type StockCheckResult = {
  productId: number;
  variationId: number | null;
  name: string;
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

type DemandGroup = {
  productId: number;
  variationId: number | null;
  qty: number;
  name: string;
};

/**
 * 將購物車列展開成實際要扣的庫存需求：
 * - 一般商品：自身
 * - 組合包：改為各子商品 × 每包數量（不檢查組合包本身庫存）
 */
async function expandStockDemands(
  base: string,
  auth: string,
  items: StockLineInput[],
): Promise<DemandGroup[]> {
  const demands = new Map<string, DemandGroup>();

  const addDemand = (
    productId: number,
    variationId: number | null,
    qty: number,
    name: string,
  ) => {
    if (!productId || qty <= 0) return;
    const key = `${productId}:${variationId || 0}`;
    const prev = demands.get(key);
    if (prev) {
      prev.qty += qty;
      return;
    }
    demands.set(key, { productId, variationId, qty, name });
  };

  for (const item of items) {
    const productId = Number(item.wcProductId || item.id);
    if (!productId) continue;
    const variationId = item.wcVariationId
      ? Number(item.wcVariationId)
      : null;
    const packQty = Number(item.qty) || 0;
    if (packQty <= 0) continue;
    const cartName = String(item.title || item.name || "商品");

    let components =
      Array.isArray(item.bundleComponents) && item.bundleComponents.length
        ? item.bundleComponents
        : null;

    if (!components) {
      const parentRaw = await fetchProductOrVariation(
        base,
        auth,
        productId,
        null,
      );
      components = parentRaw
        ? extractBundleComponentsFromWooProduct(parentRaw)
        : [];
    }

    if (components.length) {
      for (const component of components) {
        const need = packQty * Math.max(1, component.qty || 1);
        const label =
          component.name ||
          `組合包「${cartName}」所需商品 #${component.productId}`;
        addDemand(
          component.productId,
          component.variationId,
          need,
          label,
        );
      }
      continue;
    }

    addDemand(productId, variationId, packQty, cartName);
  }

  return Array.from(demands.values());
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
  const groupList = await expandStockDemands(base, auth, items);

  const fetched = await Promise.all(
    groupList.map(async (group) => {
      const raw = await fetchProductOrVariation(
        base,
        auth,
        group.productId,
        group.variationId,
      );
      return { group, raw };
    }),
  );

  const results: StockCheckResult[] = [];

  for (const { group, raw } of fetched) {
    if (!raw) {
      return {
        ok: false,
        message: `無法確認「${group.name}」庫存，請稍後再試`,
        results,
      };
    }

    const stock = parseWooStock(raw);
    const maxQty = getMaxOrderQty(stock);
    const status = String(raw?.status || "").toLowerCase();
    const trashedOrUnpurchasable =
      status === "trash" || raw?.purchasable === false;
    const ok =
      !trashedOrUnpurchasable &&
      (maxQty === null
        ? group.qty > 0
        : group.qty > 0 && group.qty <= maxQty);

    results.push({
      productId: group.productId,
      variationId: group.variationId,
      name: group.name,
      stock,
      maxQty: trashedOrUnpurchasable ? 0 : maxQty,
      requestedQty: group.qty,
      ok,
    });

    if (!ok) {
      if (trashedOrUnpurchasable) {
        return {
          ok: false,
          message: `「${group.name}」已下架或無法購買，請重新選擇加購／贈品規格。`,
          results,
        };
      }
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
