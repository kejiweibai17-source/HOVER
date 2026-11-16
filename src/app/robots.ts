import type { MetadataRoute } from "next";
import { isConstructionModeEnabled } from "@/lib/siteConstruction";

export const dynamic = "force-dynamic";

/**
 * 建置中：搜尋引擎仍擋（政策頁除外）；Meta／Facebook crawler 必須全開。
 * 正式上線：全站開放索引。
 */
export default function robots(): MetadataRoute.Robots {
  if (!isConstructionModeEnabled()) {
    return {
      rules: {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/account",
          "/account/",
          "/cart",
          "/checkout",
          "/admin",
          "/admin/",
          "/api",
          "/api/",
          "/login",
          "/register",
          "/forgot-password",
          "/reset-password",
          "/verify-email",
          "/thank-you",
          "/preview",
          "/coming-soon",
          "/auth/",
        ],
      },
      sitemap: "https://www.hoverofficial.com/sitemap.xml",
    };
  }

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
