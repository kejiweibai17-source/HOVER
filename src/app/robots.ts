import type { MetadataRoute } from "next";

/**
 * 建置中：搜尋引擎仍擋；Meta／Facebook crawler 必須全開。
 * Sharing Debugger 的 403 常被誤標成 robots，但仍需明確 allowlist。
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "facebookexternalhit",
        allow: "/",
      },
      {
        userAgent: "Facebot",
        allow: "/",
      },
      {
        userAgent: "FacebookBot",
        allow: "/",
      },
      {
        userAgent: "meta-externalagent",
        allow: "/",
      },
      {
        userAgent: "meta-externalfetcher",
        allow: "/",
      },
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
    ],
  };
}
