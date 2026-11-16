import type { Metadata } from "next";

export const SITE_NAME = "HOVER";
export const SITE_TAGLINE = "只為經典而生";
export const DEFAULT_DESCRIPTION =
  "探索 HOVER 服飾、帽款、襪子與包袋。以中性設計、舒適剪裁與簡約質感，讓每一件單品自在融入生活，陪你走過每個日常。";

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  }
  return "https://www.hoverofficial.com";
}

/** 公開頁：明確允許搜尋引擎收錄 */
export const INDEXABLE_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
    "max-video-preview": -1,
  },
};

/** 會員／結帳／系統頁：不收錄 */
export const NOINDEX_ROBOTS: NonNullable<Metadata["robots"]> = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
    nosnippet: true,
  },
};

type PublicPageSeoInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
  keywords?: string[];
  type?: "website" | "article";
};

export function buildPublicPageMetadata({
  title,
  description,
  path,
  image = "/images/hover/hero.jpg",
  keywords,
  type = "website",
}: PublicPageSeoInput): Metadata {
  const siteUrl = getSiteUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = normalizedPath === "/" ? siteUrl : `${siteUrl}${normalizedPath}`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    keywords,
    robots: INDEXABLE_ROBOTS,
    alternates: { canonical: normalizedPath },
    openGraph: {
      type,
      locale: "zh_TW",
      url: normalizedPath,
      siteName: SITE_NAME,
      title,
      description,
      images: [
        {
          url: image,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    other: {
      "og:url": url,
    },
  };
}

export function buildPrivatePageMetadata({
  title,
  description,
}: {
  title: string;
  description: string;
}): Metadata {
  return {
    metadataBase: new URL(getSiteUrl()),
    title,
    description,
    robots: NOINDEX_ROBOTS,
  };
}

/** Sitemap 應收錄的公開靜態路徑 */
export const PUBLIC_SITEMAP_ROUTES: Array<{
  path: string;
  changeFrequency:
    | "always"
    | "hourly"
    | "daily"
    | "weekly"
    | "monthly"
    | "yearly"
    | "never";
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/products", changeFrequency: "daily", priority: 0.9 },
  { path: "/brand", changeFrequency: "weekly", priority: 0.8 },
  { path: "/membership", changeFrequency: "weekly", priority: 0.8 },
  { path: "/faq", changeFrequency: "weekly", priority: 0.7 },
  { path: "/how-to-buy", changeFrequency: "monthly", priority: 0.7 },
  { path: "/returns", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.4 },
  { path: "/terms", changeFrequency: "yearly", priority: 0.4 },
  { path: "/data-deletion", changeFrequency: "yearly", priority: 0.3 },
];
