export type ShippingSettings = {
  enabled: boolean;
  homeDeliveryFee: number;
  cvsFee: number;
  freeShipThreshold: number;
};

/** 與目前結帳程式預設一致：宅配 105、超商 85、滿 2000 免運 */
export const DEFAULT_SHIPPING: ShippingSettings = {
  enabled: true,
  homeDeliveryFee: 105,
  cvsFee: 85,
  freeShipThreshold: 2000,
};

function parseBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "1" || value === 1 || value === "true") return true;
  if (value === "0" || value === 0 || value === "false") return false;
  return fallback;
}

function parseMoney(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(999999, Math.round(n)));
}

export function normalizeShippingSettings(raw: unknown): ShippingSettings {
  const d = DEFAULT_SHIPPING;
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Record<string, unknown>;
  return {
    enabled: parseBool(o.enabled, d.enabled),
    homeDeliveryFee: parseMoney(
      o.homeDeliveryFee ?? o.home_delivery_fee,
      d.homeDeliveryFee,
    ),
    cvsFee: parseMoney(o.cvsFee ?? o.cvs_fee, d.cvsFee),
    freeShipThreshold: parseMoney(
      o.freeShipThreshold ?? o.free_ship_threshold,
      d.freeShipThreshold,
    ),
  };
}

function getWordPressBase(): string {
  return (process.env.WC_API_BASE || process.env.WORDPRESS_API_URL || "").replace(
    /\/$/,
    "",
  );
}

export async function fetchShippingSettings(options?: {
  cache?: RequestCache;
}): Promise<ShippingSettings> {
  const base = getWordPressBase();
  if (!base) return DEFAULT_SHIPPING;

  try {
    const noStore = options?.cache === "no-store";
    const res = await fetch(`${base}/wp-json/hover/v1/shipping`, {
      cache: noStore ? "no-store" : undefined,
      next: noStore ? undefined : { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`Shipping API ${res.status}`);
    const data = await res.json();
    const settings = normalizeShippingSettings(data?.shipping ?? data);
    return settings.enabled ? settings : DEFAULT_SHIPPING;
  } catch {
    return DEFAULT_SHIPPING;
  }
}

/** shipMethod `000` = 宅配，其餘視為超商 */
export function baseShippingFee(
  shipMethod: string,
  settings: ShippingSettings,
): number {
  if (shipMethod === "000") {
    return settings.homeDeliveryFee || DEFAULT_SHIPPING.homeDeliveryFee;
  }
  return settings.cvsFee || DEFAULT_SHIPPING.cvsFee;
}

/**
 * 購物車「僅含」這些商品時免運（測試商品等）。
 * 以 NEXT_PUBLIC_FREE_SHIPPING_PRODUCT_IDS 覆寫（逗號分隔 Woo product id）。
 */
const DEFAULT_FREE_SHIPPING_PRODUCT_IDS = [1819]; // test / NT.10

export function getFreeShippingProductIds(): number[] {
  const raw = String(
    process.env.NEXT_PUBLIC_FREE_SHIPPING_PRODUCT_IDS ||
      process.env.FREE_SHIPPING_PRODUCT_IDS ||
      "",
  ).trim();
  if (!raw) return [...DEFAULT_FREE_SHIPPING_PRODUCT_IDS];
  const ids = raw
    .split(/[,，\s]+/)
    .map((s) => Number(s))
    .filter((n) => Number.isFinite(n) && n > 0)
    .map((n) => Math.trunc(n));
  return ids.length
    ? Array.from(new Set(ids))
    : DEFAULT_FREE_SHIPPING_PRODUCT_IDS.slice();
}

export function cartQualifiesForProductFreeShipping(
  items: Array<{ wcProductId?: number | string; id?: number | string }> | null | undefined,
): boolean {
  if (!Array.isArray(items) || items.length === 0) return false;
  const allowed = new Set(getFreeShippingProductIds());
  if (allowed.size === 0) return false;
  return items.every((it) => {
    const pid = Number(it?.wcProductId);
    return Number.isFinite(pid) && pid > 0 && allowed.has(pid);
  });
}

/** shipMethod `000` = 宅配，其餘視為超商 */
export function shippingFeeFor(
  subtotal: number,
  shipMethod: string,
  settings: ShippingSettings,
  options?: { forceFree?: boolean },
): number {
  if (options?.forceFree) return 0;
  const amount = Math.max(0, Number(subtotal) || 0);
  const threshold =
    settings.freeShipThreshold || DEFAULT_SHIPPING.freeShipThreshold;
  if (amount <= 0 || amount >= threshold) return 0;
  return baseShippingFee(shipMethod, settings);
}
