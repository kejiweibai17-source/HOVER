// lib/utils.ts

/**
 * 從圖片網址中自動萃取檔名作為 alt 標籤，並優化字串格式。
 * 範例： "https://domain.com/wp-content/uploads/gaba-lemon-balm.jpg" -> "gaba lemon balm"
 * @param url 圖片的網址
 * @param fallbackName 如果解析失敗或沒有 url 時的備用名稱（例如商品名稱或品牌名）
 * @returns 處理過後的 alt 字串，包含備用名稱與解析出的檔名
 */
export const getAltTextFromUrl = (url: string | undefined | null, fallbackName: string): string => {
  if (!url) return fallbackName;
  try {
    // 1. 取得最後一段 (檔名)
    const filenameWithExt = url.split("/").pop();
    if (!filenameWithExt) return fallbackName;

    // 2. 移除副檔名 (例如 .jpg, .png, .webp)
    const filename = filenameWithExt.split(".")[0] || "";

    // 3. 解碼 URL (把 %20 轉回空白等)
    const decoded = decodeURIComponent(filename);

    // 4. 將底線 (_) 或橫線 (-) 替換為空白，讓 Google 爬蟲更好判讀語意
    const formattedAlt = decoded.replace(/[-_]/g, " ").trim();

    // 5. 將傳入的備用名稱與解析出的檔名結合，創造極佳的長尾關鍵字
    // 例如："UFLOW 肽晶芙蓉 | gaba lemon balm"
    return formattedAlt ? `${fallbackName} | ${formattedAlt}` : fallbackName;
  } catch (error) {
    console.error("Failed to parse alt text from URL:", error);
    return fallbackName;
  }
};

/**
 * 組合多個 CSS class 的輔助工具 (常與 Tailwind 搭配使用)
 */
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

/**
 * 將 HTML 轉成純文字：去掉標籤、解碼實體（&nbsp; 等），並整理多餘空白／空行。
 * 用於 SEO meta、純文字摘要等場景。
 */
export function stripHtmlToText(html: string | null | undefined): string {
  if (!html) return "";

  return String(html)
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/\s*(p|div|li|h[1-6]|tr)\s*>/gi, "\n")
    .replace(/<\s*(p|div|li|h[1-6])[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#160;/gi, " ")
    .replace(/&#x0*a0;/gi, " ")
    .replace(/&ensp;|&emsp;|&thinsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCharCode(n) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => {
      const n = parseInt(hex, 16);
      return Number.isFinite(n) ? String.fromCharCode(n) : "";
    })
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const RICH_HTML_ALLOWED = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "span",
  "a",
  "blockquote",
  "hr",
  "sup",
  "sub",
  "div",
]);

const BLOCK_TAG_START =
  /^<(p|div|ul|ol|li|table|thead|tbody|tfoot|tr|td|th|h[1-6]|blockquote|pre|figure|figcaption|section|article|address|dl|dt|dd|hr)\b/i;

/**
 * 仿 WordPress wpautop：空行 → 段落、單一換行 → <br />。
 * 後台編輯器存回的內容常是「段落已被還原成換行」的格式，直接輸出會整段黏在一起。
 */
export function autoParagraphHtml(html: string | null | undefined): string {
  const text = String(html || "").replace(/\r\n?/g, "\n");
  if (!text.trim()) return "";

  return text
    .split(/\n{2,}/)
    .map((chunk) => {
      const trimmed = chunk.trim();
      if (!trimmed) return "";
      if (BLOCK_TAG_START.test(trimmed)) return trimmed;
      return `<p>${trimmed.replace(/\n/g, "<br />")}</p>`;
    })
    .filter(Boolean)
    .join("");
}

/**
 * 清洗商品描述 HTML：保留段落／標題／粗體／清單等格式，去掉危險標籤與空白垃圾列。
 * 前台應以 dangerouslySetInnerHTML 渲染回傳值。
 */
export function sanitizeRichHtml(html: string | null | undefined): string {
  if (!html) return "";

  let out = String(html);

  // 雙重編碼的實體（後台有時會變成 &amp;nbsp; 並原樣顯示）
  out = out.replace(/&amp;(nbsp|#160|#x0*a0|[a-z]+|#\d+|#x[0-9a-f]+);/gi, "&$1;");

  // 移除危險區塊
  out = out.replace(
    /<\s*(script|style|iframe|object|embed|form|link|meta|noscript)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,
    "",
  );
  out = out.replace(
    /<\s*(script|style|iframe|object|embed|form|link|meta|noscript|input|button|textarea|select)[^>]*\/?\s*>/gi,
    "",
  );

  // 移除事件與 javascript: URL
  out = out.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, "");
  out = out.replace(/\son\w+\s*=\s*[^\s>]+/gi, "");
  out = out.replace(
    /(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi,
    '$1="#"',
  );

  // 只保留允許的標籤；其餘剝掉標籤、保留文字
  out = out.replace(
    /<\/?([a-z0-9]+)(\s[^>]*)?>/gi,
    (match, rawTag: string, attrs = "") => {
      const tag = String(rawTag || "").toLowerCase();
      const isClose = match.startsWith("</");
      if (!RICH_HTML_ALLOWED.has(tag)) return "";
      if (tag === "br") return "<br />";
      if (tag === "hr") return "<hr />";
      if (isClose) return `</${tag}>`;

      if (tag === "a") {
        const hrefMatch = String(attrs).match(
          /href\s*=\s*(['"])(.*?)\1/i,
        );
        const href = hrefMatch?.[2]?.trim() || "";
        if (!href || /^javascript:/i.test(href)) return "<a>";
        const safe = href.replace(/"/g, "&quot;");
        const external = /^https?:\/\//i.test(href);
        return external
          ? `<a href="${safe}" target="_blank" rel="noopener noreferrer">`
          : `<a href="${safe}">`;
      }

      return `<${tag}>`;
    },
  );

  // WordPress 按 Enter 產生的空白段（&nbsp; / 空 p）改成可見換行，不要刪掉
  out = out.replace(
    /<(p|div)>\s*(?:&nbsp;|&#160;|&#x0*a0;|\u00a0|\s|<br\s*\/?>)*<\/\1>/gi,
    "<p><br /></p>",
  );
  // 清掉無意義的空 span（不影響段落間距）
  out = out.replace(
    /<span>\s*(?:&nbsp;|&#160;|&#x0*a0;|\u00a0|\s)*<\/span>/gi,
    "",
  );

  // 後台存回的換行式段落 → 還原成 <p>，避免前台黏成一整段
  out = autoParagraphHtml(out);

  return out.trim();
}

/** 商品詳情是否有可顯示內容（忽略純空白 / &nbsp;） */
export function hasRichHtmlContent(html: string | null | undefined): boolean {
  return Boolean(stripHtmlToText(html || "").trim());
}