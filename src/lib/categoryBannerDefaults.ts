export type CategoryBannerImage = {
  url: string;
  alt: string;
};

export type CategoryBannerText = {
  text: string;
  fontSize: number;
  letterSpacing: number;
  color: string;
  show: boolean;
};

export type CategoryBanner = {
  enabled: boolean;
  imageDesktop: CategoryBannerImage;
  imageMobile: CategoryBannerImage;
  title: CategoryBannerText;
  subtitle: CategoryBannerText;
};

export type CategoryBannerSettings = {
  enabled: boolean;
  version: string;
  banners: Record<string, CategoryBanner>;
};

export const CATEGORY_BANNER_SLUGS = [
  "all",
  "tops",
  "bags",
  "headwear",
  "socks",
  "others",
] as const;

function defaultText(
  text = "",
  opts?: Partial<CategoryBannerText>,
): CategoryBannerText {
  return {
    text,
    fontSize: 22,
    letterSpacing: 0.3,
    color: "#111111",
    show: true,
    ...opts,
  };
}

function defaultBanner(slug: string): CategoryBanner {
  const titles: Record<string, string> = {
    all: "全部商品種類",
    tops: "TOPS",
    bags: "BAGS",
    headwear: "HEADWEAR",
    socks: "SOCKS",
    others: "OTHERS",
  };
  return {
    enabled: true,
    imageDesktop: { url: "", alt: `HOVER ${slug.toUpperCase()}` },
    imageMobile: { url: "", alt: `HOVER ${slug.toUpperCase()}` },
    title: defaultText(titles[slug] || slug.toUpperCase()),
    subtitle: defaultText("", {
      fontSize: 13,
      letterSpacing: 0.12,
      color: "#666666",
      show: false,
    }),
  };
}

export const DEFAULT_CATEGORY_BANNERS: CategoryBannerSettings = {
  enabled: true,
  version: "1",
  banners: Object.fromEntries(
    CATEGORY_BANNER_SLUGS.map((slug) => [slug, defaultBanner(slug)]),
  ),
};

function parseBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "1" || value === 1 || value === "true") return true;
  if (value === "0" || value === 0 || value === "false") return false;
  return fallback;
}

function parseNumber(value: unknown, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function sanitizeHex(value: unknown, fallback: string): string {
  const s = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s : fallback;
}

function normalizeImage(
  raw: unknown,
  fallback: CategoryBannerImage,
): CategoryBannerImage {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  return {
    url: String(o.url || fallback.url || "").trim(),
    alt: String(o.alt || fallback.alt || "").trim(),
  };
}

function normalizeText(
  raw: unknown,
  fallback: CategoryBannerText,
): CategoryBannerText {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const fontSize = Math.min(
    64,
    Math.max(10, Math.round(parseNumber(o.fontSize, fallback.fontSize))),
  );
  const letterSpacing = Math.min(
    1.2,
    Math.max(0, parseNumber(o.letterSpacing, fallback.letterSpacing)),
  );
  return {
    text: String(o.text ?? fallback.text ?? "").trim(),
    fontSize,
    letterSpacing,
    color: sanitizeHex(o.color, fallback.color),
    show: parseBool(o.show, fallback.show),
  };
}

function normalizeBanner(raw: unknown, slug: string): CategoryBanner {
  const d = defaultBanner(slug);
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const imageDesktop = normalizeImage(o.imageDesktop, d.imageDesktop);
  let imageMobile = normalizeImage(o.imageMobile, d.imageMobile);
  if (!imageMobile.url && imageDesktop.url) {
    imageMobile = { ...imageDesktop, alt: imageMobile.alt || imageDesktop.alt };
  }
  return {
    enabled: parseBool(o.enabled, true),
    imageDesktop,
    imageMobile,
    title: normalizeText(o.title, d.title),
    subtitle: normalizeText(o.subtitle, d.subtitle),
  };
}

export function normalizeCategoryBannerSettings(
  raw: unknown,
): CategoryBannerSettings {
  const d = DEFAULT_CATEGORY_BANNERS;
  if (!raw || typeof raw !== "object") return d;
  const o = raw as Record<string, unknown>;
  const rawBanners =
    (o.banners && typeof o.banners === "object"
      ? (o.banners as Record<string, unknown>)
      : {}) || {};

  const banners: Record<string, CategoryBanner> = {};
  for (const slug of CATEGORY_BANNER_SLUGS) {
    banners[slug] = normalizeBanner(rawBanners[slug], slug);
  }
  for (const [slug, banner] of Object.entries(rawBanners)) {
    const key = String(slug || "")
      .trim()
      .toLowerCase();
    if (!key || banners[key]) continue;
    banners[key] = normalizeBanner(banner, key);
  }

  return {
    enabled: parseBool(o.enabled, true),
    version: String(o.version || d.version).trim() || d.version,
    banners,
  };
}

function getWordPressBase(): string {
  return (
    process.env.WC_API_BASE ||
    process.env.WORDPRESS_API_URL ||
    ""
  ).replace(/\/$/, "");
}

export async function fetchCategoryBannerSettings(): Promise<CategoryBannerSettings> {
  const base = getWordPressBase();
  if (!base) return DEFAULT_CATEGORY_BANNERS;

  try {
    const res = await fetch(`${base}/wp-json/hover/v1/category-banners`, {
      // 後台一更新就要前台立刻反映，不走 Data Cache
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Category banners API ${res.status}`);
    const data = await res.json();
    return normalizeCategoryBannerSettings(
      data?.categoryBanners ?? data?.category_banners ?? data,
    );
  } catch {
    return DEFAULT_CATEGORY_BANNERS;
  }
}

/** Resolve banner for /products or /products?category=slug */
export function resolveCategoryBanner(
  settings: CategoryBannerSettings,
  categorySlug?: string | null,
): CategoryBanner | null {
  if (!settings.enabled) return null;
  const slug = (categorySlug || "all").trim().toLowerCase() || "all";
  const banner = settings.banners[slug] || settings.banners.all;
  if (!banner || !banner.enabled) return null;

  const hasImage = Boolean(
    banner.imageDesktop.url.trim() || banner.imageMobile.url.trim(),
  );
  const hasText =
    (banner.title.show && banner.title.text.trim()) ||
    (banner.subtitle.show && banner.subtitle.text.trim());

  if (!hasImage && !hasText) return null;
  return banner;
}
