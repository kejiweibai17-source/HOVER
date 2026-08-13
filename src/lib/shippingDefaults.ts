export type ShippingSettings = {
  enabled: boolean;
  homeDeliveryFee: number;
  cvsFee: number;
  freeShipThreshold: number;
};

/** 與目前結帳程式預設一致：宅配 105、超商 0、滿 1500 免運 */
export const DEFAULT_SHIPPING: ShippingSettings = {
  enabled: true,
  homeDeliveryFee: 105,
  cvsFee: 0,
  freeShipThreshold: 1500,
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
export function shippingFeeFor(
  subtotal: number,
  shipMethod: string,
  settings: ShippingSettings,
): number {
  const amount = Math.max(0, Number(subtotal) || 0);
  if (amount <= 0 || amount >= settings.freeShipThreshold) return 0;
  return shipMethod === "000" ? settings.homeDeliveryFee : settings.cvsFee;
}
