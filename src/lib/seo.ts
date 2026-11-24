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

export type PublicPageSeo = {
  path: string;
  /** 搜尋結果 sitelink 短標題（頁面名稱） */
  sitelinkName: string;
  title: string;
  /** 該頁唯一 meta description；首頁 sitelink JSON-LD 必須與此一致 */
  description: string;
  keywords?: string[];
  /** 列為首頁 Google sitelink 候選 */
  sitelink?: boolean;
};

/**
 * 全站公開頁 SEO 單一來源。
 * 修改 description 後，該頁 meta 與首頁 sitelink 結構化資料會同步。
 */
/**
 * 對齊《HOVER_SEO_OG_設定 0721.xlsx》
 * Title / Meta Description 必須與此表一致；OG 未特別指定時沿用 SEO。
 */
export const PUBLIC_PAGE_SEO: Record<string, PublicPageSeo> = {
  "/": {
    path: "/",
    sitelinkName: "首頁",
    title: "HOVER｜只為經典而生",
    description: DEFAULT_DESCRIPTION,
    keywords: ["HOVER", "服飾", "中性服飾", "帽款", "襪子", "包袋"],
  },
  "/products": {
    path: "/products",
    sitelinkName: "所有商品",
    // 表內無「所有商品」列；維持全館列表用文案（分類頁另見 PRODUCT_CATEGORY_SEO）
    title: "所有商品｜HOVER",
    description:
      "探索 HOVER 全系列服飾、帽款、襪子與包袋，以舒適剪裁與簡約質感，陪伴每個日常。",
    keywords: ["HOVER", "服飾", "商品", "帽款", "襪子", "包袋"],
    sitelink: true,
  },
  "/brand": {
    path: "/brand",
    sitelinkName: "品牌故事",
    title: "品牌故事｜HOVER",
    description:
      "了解 HOVER 品牌故事。我們相信真正的風格，不是被定義，而是回到自己。探索 HOVER 中性日常服飾，以舒適剪裁與簡約質感，陪你找到屬於自己的經典。",
    keywords: ["HOVER", "品牌故事", "服飾品牌"],
    sitelink: true,
  },
  "/membership": {
    path: "/membership",
    sitelinkName: "會員制度",
    title: "會員制度｜HOVER",
    description:
      "加入 HOVER 會員，享有入會禮、生日禮、會員優惠與消費累積升等，了解完整會員權益與專屬福利。",
    keywords: ["HOVER", "會員制度", "會員優惠", "購物金"],
    sitelink: true,
  },
  "/how-to-buy": {
    path: "/how-to-buy",
    sitelinkName: "如何購買",
    title: "如何購買｜HOVER",
    description:
      "了解 HOVER 如何購買，包含付款方式、配送說明、出貨時間及訂單相關資訊。",
    keywords: ["HOVER", "如何購買", "付款", "配送"],
    sitelink: true,
  },
  "/faq": {
    path: "/faq",
    sitelinkName: "常見問題",
    title: "常見問題｜HOVER",
    description:
      "查看 HOVER 常見問題，包含商品、會員、付款、配送、退貨及購物相關資訊。",
    keywords: ["HOVER", "常見問題", "FAQ", "客服"],
    sitelink: true,
  },
  "/returns": {
    path: "/returns",
    sitelinkName: "申請退貨",
    title: "申請退貨｜HOVER",
    description:
      "了解 HOVER 退貨流程、退貨申請方式、退款說明及相關注意事項。",
    keywords: ["HOVER", "退貨", "退款"],
    sitelink: true,
  },
  "/contact": {
    path: "/contact",
    sitelinkName: "聯絡我們",
    title: "聯絡我們｜HOVER",
    description:
      "有任何商品、訂單或會員相關問題，歡迎透過 HOVER 聯絡我們表單與客服信箱取得協助。",
    keywords: ["HOVER", "聯絡我們", "客服", "服飾品牌"],
    sitelink: true,
  },
  "/privacy": {
    path: "/privacy",
    sitelinkName: "隱私權政策",
    title: "隱私權政策｜HOVER",
    description:
      "查看 HOVER 隱私權政策，了解個人資料蒐集、使用方式及資訊安全保護。",
    keywords: ["HOVER", "隱私權政策", "個資"],
  },
  "/terms": {
    path: "/terms",
    sitelinkName: "服務條款",
    title: "服務條款｜HOVER",
    description: "查看 HOVER 網站服務條款與網站使用規範。",
    keywords: ["HOVER", "服務條款"],
  },
  "/data-deletion": {
    path: "/data-deletion",
    sitelinkName: "資料刪除說明",
    title: "資料刪除說明｜HOVER",
    description:
      "說明如何申請刪除 HOVER 透過 Facebook 登入所取得的個人資料。",
    keywords: ["HOVER", "資料刪除", "Facebook"],
  },
};

/** 商品分類頁（?category=）— 對齊 Excel「服飾／帽款／襪子／包袋分類」 */
export const PRODUCT_CATEGORY_SEO: Record<string, PublicPageSeo> = {
  tops: {
    path: "/products?category=tops",
    sitelinkName: "服飾",
    title: "服飾｜HOVER",
    description:
      "探索 HOVER 服飾系列，以中性設計、舒適剪裁與簡約質感，打造自在融入生活的日常穿著。",
    keywords: ["HOVER", "服飾", "上衣"],
  },
  headwear: {
    path: "/products?category=headwear",
    sitelinkName: "帽款",
    title: "帽款｜HOVER",
    description:
      "探索 HOVER 帽款系列，以簡約設計與舒適版型，打造適合日常穿搭的經典帽款。",
    keywords: ["HOVER", "帽款", "帽子"],
  },
  socks: {
    path: "/products?category=socks",
    sitelinkName: "襪子",
    title: "襪子｜HOVER",
    description:
      "探索 HOVER 襪子系列，以舒適著感與簡約設計，為日常穿搭增添細節與質感。",
    keywords: ["HOVER", "襪子"],
  },
  bags: {
    path: "/products?category=bags",
    sitelinkName: "包袋",
    title: "包袋｜HOVER",
    description: "探索 HOVER 包袋系列，以簡約設計與實用機能，陪伴每個日常。",
    keywords: ["HOVER", "包袋", "包包"],
  },
};

export function getProductCategorySeo(categorySlug: string): PublicPageSeo | null {
  const key = String(categorySlug || "")
    .trim()
    .toLowerCase();
  return PRODUCT_CATEGORY_SEO[key] || null;
}

export function getPublicPageSeo(path: string): PublicPageSeo {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return (
    PUBLIC_PAGE_SEO[normalized] || {
      path: normalized,
      sitelinkName: SITE_NAME,
      title: SITE_NAME,
      description: DEFAULT_DESCRIPTION,
    }
  );
}

/** 首頁 Google sitelink 候選（順序＝建議曝光優先） */
export function getSitelinkPages(
  overrides: Partial<Record<string, Pick<PublicPageSeo, "title" | "description" | "sitelinkName">>> = {},
): PublicPageSeo[] {
  return Object.values(PUBLIC_PAGE_SEO)
    .filter((page) => page.sitelink)
    .map((page) => {
      const override = overrides[page.path];
      if (!override) return page;
      return {
        ...page,
        title: override.title || page.title,
        description: override.description || page.description,
        sitelinkName: override.sitelinkName || page.sitelinkName,
      };
    });
}

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
  const catalog = PUBLIC_PAGE_SEO[normalizedPath];
  // 強制與該頁設定一致：有 catalog 時以 catalog description／keywords 為準（可被明確傳入覆蓋 title 等）
  const finalDescription = description || catalog?.description || DEFAULT_DESCRIPTION;
  const finalTitle = title || catalog?.title || SITE_NAME;
  const finalKeywords = keywords || catalog?.keywords;

  return {
    metadataBase: new URL(siteUrl),
    title: finalTitle,
    description: finalDescription,
    keywords: finalKeywords,
    robots: INDEXABLE_ROBOTS,
    alternates: { canonical: normalizedPath },
    openGraph: {
      type,
      locale: "zh_TW",
      url: normalizedPath,
      siteName: SITE_NAME,
      title: finalTitle,
      description: finalDescription,
      images: [
        {
          url: image,
          alt: finalTitle,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: finalTitle,
      description: finalDescription,
      images: [image],
    },
    other: {
      "og:url": url,
    },
  };
}

/** 用路徑從 catalog 建立 metadata（各頁共用） */
export function buildPublicPageMetadataFromPath(
  path: string,
  overrides: Partial<PublicPageSeoInput> = {},
): Metadata {
  const page = getPublicPageSeo(path);
  return buildPublicPageMetadata({
    title: overrides.title || page.title,
    description: overrides.description || page.description,
    path: page.path,
    image: overrides.image,
    keywords: overrides.keywords || page.keywords,
    type: overrides.type,
  });
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

function absoluteUrl(siteUrl: string, path: string): string {
  const base = siteUrl.replace(/\/$/, "");
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

/** 首頁／全站：Organization */
export function buildOrganizationJsonLd(siteUrl = getSiteUrl()) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl.replace(/\/$/, "")}/#organization`,
    name: "停機坪國際文創股份有限公司",
    alternateName: "HOVER",
    url: siteUrl.replace(/\/$/, ""),
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl(siteUrl, "/images/logo/logo.svg"),
    },
    image: absoluteUrl(siteUrl, "/images/hover/hero.jpg"),
    description:
      "HOVER 是一個為日常而設計的服飾品牌，精選兼具舒適、質感與實穿性的服飾單品。",
    email: "service@hoverofficial.com",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "service@hoverofficial.com",
      areaServed: "TW",
      availableLanguage: ["Traditional Chinese", "English"],
    },
  };
}

/** 首頁：WebSite（含站內搜尋） */
export function buildWebSiteJsonLd(siteUrl = getSiteUrl()) {
  const home = getPublicPageSeo("/");
  const base = siteUrl.replace(/\/$/, "");
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base}/#website`,
    url: base,
    name: SITE_NAME,
    alternateName: home.title,
    description: home.description,
    publisher: { "@id": `${base}/#organization` },
    inLanguage: "zh-TW",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${base}/products?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * 首頁 sitelinks 結構化資料：
 * - SiteNavigationElement：導覽結構
 * - ItemList：重要頁清單，description 強制等於各頁 meta description
 */
export function buildSitelinksJsonLd(
  sitelinkPages: PublicPageSeo[],
  siteUrl = getSiteUrl(),
) {
  const base = siteUrl.replace(/\/$/, "");
  const elements = sitelinkPages.map((page, index) => {
    const url = absoluteUrl(siteUrl, page.path);
    return {
      "@type": "SiteNavigationElement",
      "@id": `${base}/#sitelink-${page.path.replace(/\//g, "") || "home"}`,
      position: index + 1,
      name: page.sitelinkName,
      description: page.description,
      url,
    };
  });

  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${base}/#sitelinks`,
    name: "HOVER 主要導覽",
    description: "HOVER 官方網站主要頁面，對應搜尋結果 sitelink 與各頁說明。",
    numberOfItems: sitelinkPages.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: sitelinkPages.map((page, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: page.sitelinkName,
      description: page.description,
      url: absoluteUrl(siteUrl, page.path),
      item: {
        "@type": "WebPage",
        "@id": `${absoluteUrl(siteUrl, page.path)}#webpage`,
        url: absoluteUrl(siteUrl, page.path),
        name: page.title,
        description: page.description,
        isPartOf: { "@id": `${base}/#website` },
      },
    })),
  };

  const navigation = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${base}/#main-navigation`,
    name: "HOVER 網站導覽",
    itemListElement: elements,
  };

  return { navigation, itemList };
}

/** 各公開頁 WebPage JSON-LD（description 與 meta 一致） */
export function buildWebPageJsonLd(input: {
  path: string;
  title?: string;
  description?: string;
  siteUrl?: string;
}) {
  const siteUrl = (input.siteUrl || getSiteUrl()).replace(/\/$/, "");
  const page = getPublicPageSeo(input.path);
  const title = input.title || page.title;
  const description = input.description || page.description;
  const url = absoluteUrl(siteUrl, page.path);

  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${url}#webpage`,
    url,
    name: title,
    description,
    isPartOf: { "@id": `${siteUrl}/#website` },
    about: { "@id": `${siteUrl}/#organization` },
    inLanguage: "zh-TW",
  };
}
