/** KOL／合作夥伴專屬連結（?ref=CODE）歸因 */

export const AFFILIATE_REF_COOKIE = "hover_ref";
export const AFFILIATE_REF_PARAM = "ref";
/** 點擊後 30 天內下單都歸給該夥伴（最後點擊優先） */
export const AFFILIATE_REF_MAX_AGE = 60 * 60 * 24 * 30;

export function normalizeRefCode(raw: unknown): string {
  const code = String(raw ?? "")
    .trim()
    .toUpperCase();
  return /^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(code) ? code : "";
}

export function readRefFromCookieHeader(cookieHeader: string | null): string {
  if (!cookieHeader) return "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${AFFILIATE_REF_COOKIE}=([^;]*)`),
  );
  if (!match) return "";
  try {
    return normalizeRefCode(decodeURIComponent(match[1]));
  } catch {
    return "";
  }
}

export function readRefFromDocumentCookie(): string {
  if (typeof document === "undefined") return "";
  return readRefFromCookieHeader(document.cookie);
}
