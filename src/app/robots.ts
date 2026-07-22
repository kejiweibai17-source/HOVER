import type { MetadataRoute } from "next";

/**
 * 建置中：禁止搜尋引擎爬取與索引。
 * 網站仍可正常以網址瀏覽；正式上線時改回 Allow: / 並移除 layout 的 noindex。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
