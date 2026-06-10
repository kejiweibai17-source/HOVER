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