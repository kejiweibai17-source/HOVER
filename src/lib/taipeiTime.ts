// lib/taipeiTime.ts
// WooCommerce REST 的 date_created 是「網站時區、無時區標記」的字串；
// 若 WP 時區設成 UTC，前端 new Date() 會被當成瀏覽器本地時間，顯示就會差 8 小時。
// 一律優先使用 *_gmt 並補 Z，顯示時固定用 Asia/Taipei。

export const TAIPEI_TZ = "Asia/Taipei";

/** 把 WC 的 *_gmt（無 Z）轉成帶 Z 的 ISO；沒有 gmt 時回傳原值 */
export function wcGmtToIso(
  gmt?: string | null,
  fallback?: string | null,
): string | null {
  const g = String(gmt || "").trim();
  if (g && g !== "0000-00-00T00:00:00") {
    return /([zZ]|[+-]\d{2}:?\d{2})$/.test(g) ? g : `${g}Z`;
  }
  const f = String(fallback || "").trim();
  return f || null;
}

type DateParts = {
  y: string;
  m: string;
  d: string;
  hh: string;
  mm: string;
  ss: string;
};

export function taipeiParts(value?: string | number | Date | null): DateParts | null {
  if (value === null || value === undefined || value === "") return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TAIPEI_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: string) =>
    parts.find((p) => p.type === type)?.value || "00";
  return {
    y: pick("year"),
    m: pick("month"),
    d: pick("day"),
    hh: pick("hour"),
    mm: pick("minute"),
    ss: pick("second"),
  };
}

/** 2026/11/04 或 2026/11/04 21:30（台灣時間） */
export function formatTaipei(
  value?: string | number | Date | null,
  withTime = false,
): string {
  const p = taipeiParts(value);
  if (!p) return "";
  const day = `${p.y}/${p.m}/${p.d}`;
  return withTime ? `${day} ${p.hh}:${p.mm}` : day;
}
