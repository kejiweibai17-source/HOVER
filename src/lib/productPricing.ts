/** Woo 商品／變體價格欄位（REST 回傳） */
export type WooPriceFields = {
  price?: string | number | null;
  regular_price?: string | number | null;
  sale_price?: string | number | null;
  on_sale?: boolean | string | number | null;
  date_on_sale_from?: string | null;
  date_on_sale_to?: string | null;
  date_on_sale_from_gmt?: string | null;
  date_on_sale_to_gmt?: string | null;
};

export type ResolvedWooPrices = {
  price: number;
  regularPrice: number;
  salePrice: number | null;
};

function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const s = String(value).trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parseSaleInstant(value: string | null | undefined): number | null {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * 是否處於促銷有效期間。
 * 優先採 Woo 計算的 on_sale；缺省時再依 date_on_sale_* 判斷。
 * （Woo 在開始日前仍會回傳 sale_price，不可直接當現價。）
 */
export function isWooSaleActive(raw: WooPriceFields, nowMs = Date.now()): boolean {
  const flag = raw.on_sale;
  if (flag === true || flag === 1 || flag === "1" || flag === "true") return true;
  if (flag === false || flag === 0 || flag === "0" || flag === "false") return false;

  const from = parseSaleInstant(
    raw.date_on_sale_from_gmt || raw.date_on_sale_from,
  );
  const to = parseSaleInstant(raw.date_on_sale_to_gmt || raw.date_on_sale_to);

  // 無 on_sale、也無排程：視為未促銷（避免誤顯示已排程折扣）
  if (from == null && to == null) return false;
  if (from != null && nowMs < from) return false;
  if (to != null && nowMs > to) return false;
  return toNumber(raw.sale_price) != null;
}

/** 解析目前應顯示的原價／特價（未開始或已結束的 sale_price 會略過） */
export function resolveWooPrices(
  raw: WooPriceFields,
  nowMs = Date.now(),
): ResolvedWooPrices {
  const regularPrice =
    toNumber(raw.regular_price) ?? toNumber(raw.price) ?? 0;
  const saleRaw = toNumber(raw.sale_price);
  const salePrice =
    isWooSaleActive(raw, nowMs) &&
    saleRaw != null &&
    saleRaw > 0 &&
    (regularPrice <= 0 || saleRaw < regularPrice)
      ? saleRaw
      : null;

  const price =
    salePrice != null
      ? salePrice
      : toNumber(raw.price) ?? regularPrice;

  return {
    price,
    regularPrice,
    salePrice,
  };
}
