/**
 * 網站建置中閘門（正式金流測試期間）
 *
 * 環境變數（Vercel／.env.local）：
 * - SITE_CONSTRUCTION_MODE=1 … 開啟後一般訪客只看建置中頁
 * - SITE_PREVIEW_SECRET=…   … 解鎖用密鑰
 *
 * 測試網址：https://hoverofficial.com/preview?key=<SITE_PREVIEW_SECRET>
 * 會寫入 Cookie，之後同瀏覽器可正常購物／付款。
 */

export const SITE_PREVIEW_COOKIE = "hover_site_preview";

export function isConstructionModeEnabled(): boolean {
  const v = String(process.env.SITE_CONSTRUCTION_MODE || "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export function getPreviewSecret(): string {
  return String(process.env.SITE_PREVIEW_SECRET || "").trim();
}

/** 金流／物流回呼、靜態資源等：建置中仍放行（不需 Cookie） */
export function isConstructionPassthrough(pathname: string): boolean {
  if (pathname === "/coming-soon") return true;
  if (pathname === "/preview" || pathname.startsWith("/preview/")) return true;

  // 搜尋引擎／FB 審核政策頁
  if (
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/data-deletion" ||
    pathname === "/fb-data-deletion.html" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return true;
  }

  // 伺服器對伺服器回呼（訪客無 Cookie）
  if (
    pathname.startsWith("/api/ecpay") ||
    pathname.startsWith("/api/linepay") ||
    pathname.startsWith("/api/logistics")
  ) {
    return true;
  }

  return false;
}
