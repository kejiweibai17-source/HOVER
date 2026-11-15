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
  /**
   * 可變商品父層 regular_price／sale_price 常為空字串，
   * price_html 仍含刪線原價與特價，可作後備來源。
   */
  price_html?: string | null;
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

function decodeBasicEntities(html: string): string {
  return html
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCharCode(n) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const n = Number.parseInt(hex, 16);
      return Number.isFinite(n) ? String.fromCharCode(n) : "";
    })
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&");
}

function firstAmount(
  text: string,
  patterns: RegExp[],
): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const n = Number(String(match[1]).replace(/,/g, ""));
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

/**
 * 從 Woo price_html 抽原價／特價。
 * 可變商品父層 REST 常只給 price + on_sale，原價／特價欄位為空。
 */
export function parsePricesFromHtml(html: string | null | undefined): {
  regular: number | null;
  sale: number | null;
} {
  const raw = String(html || "").trim();
  if (!raw) return { regular: null, sale: null };
  const text = decodeBasicEntities(raw);

  const regular = firstAmount(text, [
    /原始價格[：:]\s*(?:NT\$|NT\.|\$)?\s*([\d,]+(?:\.\d+)?)/i,
    /Original price:\s*(?:NT\$|NT\.|\$)?\s*([\d,]+(?:\.\d+)?)/i,
    /<del\b[^>]*>[\s\S]*?([\d,]+(?:\.\d+)?)/i,
  ]);
  const sale = firstAmount(text, [
    /目前價格[：:]\s*(?:NT\$|NT\.|\$)?\s*([\d,]+(?:\.\d+)?)/i,
    /Current price:\s*(?:NT\$|NT\.|\$)?\s*([\d,]+(?:\.\d+)?)/i,
    /<ins\b[^>]*>[\s\S]*?([\d,]+(?:\.\d+)?)/i,
  ]);

  return { regular, sale };
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
  return (
    toNumber(raw.sale_price) != null ||
    parsePricesFromHtml(raw.price_html).sale != null
  );
}

/** 解析目前應顯示的原價／特價（未開始或已結束的 sale_price 會略過） */
export function resolveWooPrices(
  raw: WooPriceFields,
  nowMs = Date.now(),
): ResolvedWooPrices {
  const onSale = isWooSaleActive(raw, nowMs);
  const fieldRegular = toNumber(raw.regular_price);
  const fieldSale = toNumber(raw.sale_price);
  const fieldPrice = toNumber(raw.price);

  // 可變商品父層 regular／sale 常為空：改從 price_html 還原雙價
  const needHtml =
    fieldRegular == null || (onSale && fieldSale == null);
  const fromHtml = needHtml
    ? parsePricesFromHtml(raw.price_html)
    : { regular: null, sale: null };

  const regularPrice =
    fieldRegular ??
    fromHtml.regular ??
    // 促銷中勿把現價（特價）當成原價
    (onSale ? 0 : fieldPrice) ??
    0;

  const saleRaw =
    fieldSale ??
    (onSale ? fromHtml.sale ?? fieldPrice : null);

  const salePrice =
    onSale &&
    saleRaw != null &&
    saleRaw > 0 &&
    (regularPrice <= 0 || saleRaw < regularPrice)
      ? saleRaw
      : null;

  // 若 HTML 有原價、現價相同於特價，補上正確原價供刪線顯示
  const displayRegular =
    salePrice != null &&
    (regularPrice <= 0 || regularPrice <= salePrice) &&
    fromHtml.regular != null &&
    fromHtml.regular > salePrice
      ? fromHtml.regular
      : regularPrice > 0
        ? regularPrice
        : salePrice != null
          ? salePrice
          : fieldPrice ?? 0;

  const price =
    salePrice != null
      ? salePrice
      : fieldPrice ?? displayRegular;

  return {
    price,
    regularPrice: displayRegular,
    salePrice,
  };
}
