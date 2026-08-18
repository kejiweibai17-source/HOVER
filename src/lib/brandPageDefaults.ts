export type BrandPageImage = {
  url: string;
  alt: string;
};

export type BrandPageSettings = {
  enabled: boolean;
  version: string;
  imageDesktop: BrandPageImage;
  imageMobile: BrandPageImage;
  seoTitle: string;
  seoDescription: string;
  seoHeading: string;
  seoBody: string;
};

export const FALLBACK_BRAND_IMAGE = "/images/brand/280d8452-422a-4056-a5db-bea5277f5f5e.png";

export const DEFAULT_BRAND_PAGE: BrandPageSettings = {
  enabled: true,
  version: "1",
  imageDesktop: { url: "", alt: "HOVER 品牌故事" },
  imageMobile: { url: "", alt: "HOVER 品牌故事" },
  seoTitle: "品牌故事｜HOVER",
  seoDescription:
    "了解 HOVER 品牌故事。我們相信真正的風格，不是被定義，而是回到自己。探索 HOVER 中性日常服飾，以舒適剪裁與簡約質感，陪你找到屬於自己的經典。",
  seoHeading: "HOVER相信真正的風格，不是被定義，而是回到自己。",
  seoBody:
    "我們不追逐流行，只願找到屬於自己的經典。\n陪你走過每一個日常，成為自己喜歡的樣子。",
};

function getWordPressBase(): string {
  return (process.env.WC_API_BASE || process.env.WORDPRESS_API_URL || "").replace(
    /\/$/,
    "",
  );
}

function asImage(raw: unknown, fallback: BrandPageImage): BrandPageImage {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    url: String(o.url || "").trim(),
    alt: String(o.alt || fallback.alt).trim() || fallback.alt,
  };
}

export function normalizeBrandPage(raw: unknown): BrandPageSettings {
  const d = DEFAULT_BRAND_PAGE;
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Record<string, unknown>;
  const desktop = asImage(o.imageDesktop ?? o.image_desktop, d.imageDesktop);
  let mobile = asImage(o.imageMobile ?? o.image_mobile, d.imageMobile);
  if (!mobile.url && desktop.url) {
    mobile = { ...mobile, url: desktop.url, alt: mobile.alt || desktop.alt };
  }
  return {
    enabled: o.enabled !== false,
    version: String(o.version || d.version),
    imageDesktop: desktop,
    imageMobile: mobile,
    seoTitle: String(o.seoTitle || o.seo_title || d.seoTitle).trim() || d.seoTitle,
    seoDescription:
      String(o.seoDescription || o.seo_description || d.seoDescription).trim() ||
      d.seoDescription,
    seoHeading:
      String(o.seoHeading || o.seo_heading || d.seoHeading).trim() || d.seoHeading,
    seoBody: String(o.seoBody || o.seo_body || d.seoBody).trim() || d.seoBody,
  };
}

export function brandPageHasCustomImage(page: BrandPageSettings): boolean {
  return Boolean(page.enabled && page.imageDesktop.url);
}

export function encodeBrandImageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const u = new URL(trimmed);
    u.pathname = u.pathname
      .split("/")
      .map((seg) => {
        if (!seg) return seg;
        try {
          return encodeURIComponent(decodeURIComponent(seg));
        } catch {
          return encodeURIComponent(seg);
        }
      })
      .join("/");
    return u.toString();
  } catch {
    return encodeURI(trimmed);
  }
}

/**
 * 讀取後台「HOVER 品牌故事」（hover-brand-page-studio.php）。
 */
export async function fetchBrandPage(): Promise<BrandPageSettings> {
  const base = getWordPressBase();
  if (!base) return DEFAULT_BRAND_PAGE;

  try {
    const res = await fetch(`${base}/wp-json/hover/v1/brand-page`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Brand page API ${res.status}`);
    const data = await res.json();
    return normalizeBrandPage(data?.brandPage ?? data);
  } catch {
    return DEFAULT_BRAND_PAGE;
  }
}
