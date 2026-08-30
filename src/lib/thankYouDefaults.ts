import { encodeBrandImageUrl } from "@/lib/brandPageDefaults";

export type ThankYouPageImage = {
  url: string;
  alt: string;
};

export type ThankYouPageSettings = {
  enabled: boolean;
  version: string;
  imageDesktop: ThankYouPageImage;
  imageMobile: ThankYouPageImage;
};

export const FALLBACK_THANK_YOU_IMAGE = "/images/hover/pdp-main-1.jpg";

export const DEFAULT_THANK_YOU_PAGE: ThankYouPageSettings = {
  enabled: true,
  version: "1",
  imageDesktop: { url: "", alt: "HOVER" },
  imageMobile: { url: "", alt: "HOVER" },
};

function getWordPressBase(): string {
  return (process.env.WC_API_BASE || process.env.WORDPRESS_API_URL || "").replace(
    /\/$/,
    "",
  );
}

function asImage(raw: unknown, fallback: ThankYouPageImage): ThankYouPageImage {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    url: String(o.url || "").trim(),
    alt: String(o.alt || fallback.alt).trim() || fallback.alt,
  };
}

export function normalizeThankYouPage(raw: unknown): ThankYouPageSettings {
  const d = DEFAULT_THANK_YOU_PAGE;
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
  };
}

export function thankYouPageHasCustomImage(page: ThankYouPageSettings): boolean {
  return Boolean(page.enabled && page.imageDesktop.url);
}

export { encodeBrandImageUrl as encodeThankYouImageUrl };

/**
 * 讀取後台「HOVER 感謝頁」（hover-thank-you-studio.php）。
 */
export async function fetchThankYouPage(): Promise<ThankYouPageSettings> {
  const base = getWordPressBase();
  if (!base) return DEFAULT_THANK_YOU_PAGE;

  try {
    const res = await fetch(`${base}/wp-json/hover/v1/thank-you-page`, {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Thank-you page API ${res.status}`);
    const data = await res.json();
    return normalizeThankYouPage(data?.thankYouPage ?? data);
  } catch {
    return DEFAULT_THANK_YOU_PAGE;
  }
}
