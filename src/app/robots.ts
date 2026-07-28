import type { MetadataRoute } from "next";

/**
 * 建置中：禁止搜尋引擎爬取與索引。
 * 僅開放 Facebook App 審核需要的政策頁。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/privacy",
          "/terms",
          "/data-deletion",
          "/fb-data-deletion.html",
        ],
        disallow: "/",
      },
      {
        userAgent: "facebookexternalhit",
        allow: "/",
      },
      {
        userAgent: "Facebot",
        allow: "/",
      },
    ],
  };
}
