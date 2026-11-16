// app/layout.tsx  — Server Component root layout (App Router)
import type { Metadata } from "next";
import { isConstructionModeEnabled } from "@/lib/siteConstruction";
import {
  DEFAULT_DESCRIPTION,
  INDEXABLE_ROBOTS,
  NOINDEX_ROBOTS,
  SITE_NAME,
  getSiteUrl,
} from "@/lib/seo";
import GoogleTagManager from "@/components/GoogleTagManager";
import "./fonts.css";
import "./globals.css";
import ClientLayout from "./ClientLayout";

export async function generateMetadata(): Promise<Metadata> {
  const constructionOn = isConstructionModeEnabled();
  const siteUrl = getSiteUrl();
  const title = `${SITE_NAME}｜只為經典而生`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description: DEFAULT_DESCRIPTION,
    applicationName: SITE_NAME,
    // 建置中：不進搜尋；正式上線後全站預設允許收錄（私有頁可再覆寫 noindex）
    robots: constructionOn ? NOINDEX_ROBOTS : INDEXABLE_ROBOTS,
    openGraph: {
      type: "website",
      locale: "zh_TW",
      url: siteUrl,
      siteName: SITE_NAME,
      title,
      description: DEFAULT_DESCRIPTION,
      images: [
        {
          url: "/images/hover/hero.jpg",
          alt: "HOVER 品牌主視覺",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: DEFAULT_DESCRIPTION,
      images: ["/images/hover/hero.jpg"],
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      ],
      shortcut: "/favicon.ico",
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
  };
}

// App Router 規定：<html> / <body> 只能放在 Server Component layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-hover-bg font-sans text-slate-900 antialiased">
        <GoogleTagManager />
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
