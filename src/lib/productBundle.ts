/** HOVER 動態組合包：綁定子商品／變體扣庫存 */

export type BundleComponent = {
  productId: number;
  variationId: number | null;
  qty: number;
  name?: string;
};

export function parseBundleComponents(raw: unknown): BundleComponent[] {
  let data: unknown = raw;
  if (typeof data === "string" && data.trim()) {
    try {
      data = JSON.parse(data);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(data)) return [];

  const out: BundleComponent[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const productId = Number(r.product_id ?? r.productId) || 0;
    if (productId <= 0) continue;
    const variationId = Number(r.variation_id ?? r.variationId) || 0;
    const qty = Math.max(1, Math.floor(Number(r.qty) || 1));
    const name = String(r.name || "").trim();
    out.push({
      productId,
      variationId: variationId > 0 ? variationId : null,
      qty,
      name: name || undefined,
    });
  }
  return out;
}

export function extractBundleComponentsFromWooProduct(product: {
  hover_bundle_components?: unknown;
  meta_data?: Array<{ key?: string; value?: unknown }>;
}): BundleComponent[] {
  if (product.hover_bundle_components != null) {
    const fromField = parseBundleComponents(product.hover_bundle_components);
    if (fromField.length) return fromField;
  }
  const meta = product.meta_data?.find(
    (m) => String(m?.key || "") === "hover_bundle_components",
  );
  if (meta?.value != null && meta.value !== "") {
    return parseBundleComponents(meta.value);
  }
  return [];
}

/** 由可賣包數合成 ProductStock 用的數量語意 */
export function bundleAvailableQtyFromWoo(product: {
  hover_bundle_available_qty?: unknown;
  hover_bundle_in_stock?: unknown;
}): number | null | undefined {
  if (
    product.hover_bundle_available_qty === null ||
    product.hover_bundle_available_qty === undefined ||
    product.hover_bundle_available_qty === ""
  ) {
    // 未提供時交由呼叫端決定
    if (typeof product.hover_bundle_in_stock === "boolean") {
      return product.hover_bundle_in_stock ? null : 0;
    }
    return undefined;
  }
  const n = Number(product.hover_bundle_available_qty);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : undefined;
}
