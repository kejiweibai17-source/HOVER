import { HOVER_PLACEHOLDER_IMAGE } from "@/lib/hoverPlaceholder";

export type HeroMediaType = "image" | "video";

export type HeroSlideImage = {
  url: string;
  alt: string;
};

export type HeroSlideVideo = {
  url: string;
};

export type HeroSlideLink = {
  href: string;
};

export type HeroSlideCta = {
  label: string;
  show: boolean;
};

export type HeroSlide = {
  id: string;
  enabled: boolean;
  mediaType: HeroMediaType;
  image: HeroSlideImage;
  video: HeroSlideVideo;
  link: HeroSlideLink;
  cta: HeroSlideCta;
};

export type HeroSettings = {
  enabled: boolean;
  version: string;
  autoplayMs: number;
  slides: HeroSlide[];
};

export const DEFAULT_HERO: HeroSettings = {
  enabled: true,
  version: "1",
  autoplayMs: 5000,
  slides: [],
};

export const FALLBACK_HERO: HeroSettings = {
  enabled: true,
  version: "1",
  autoplayMs: 5000,
  slides: [1, 2, 3].map((n) => ({
    id: `hero-fallback-${n}`,
    enabled: true,
    mediaType: "image" as const,
    image: {
      url: HOVER_PLACEHOLDER_IMAGE,
      alt: "HOVER",
    },
    video: { url: "" },
    link: { href: "/products" },
    cta: { label: "SHOP NOW", show: true },
  })),
};

function parseBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "1" || value === 1 || value === "true") return true;
  if (value === "0" || value === 0 || value === "false") return false;
  return fallback;
}

function slideHasMedia(slide: HeroSlide): boolean {
  if (slide.mediaType === "video") return Boolean(slide.video.url.trim());
  return Boolean(slide.image.url.trim());
}

function normalizeSlide(raw: unknown, index: number): HeroSlide {
  const d = FALLBACK_HERO.slides[0];
  if (!raw || typeof raw !== "object") {
    return { ...d, id: `hero-${index + 1}` };
  }

  const o = raw as Record<string, unknown>;
  const imageRaw = (o.image as Record<string, unknown>) || {};
  const videoRaw = (o.video as Record<string, unknown>) || {};
  const linkRaw = (o.link as Record<string, unknown>) || {};
  const ctaRaw = (o.cta as Record<string, unknown>) || {};
  const typeRaw = String(o.mediaType || o.media_type || "image");
  const mediaType: HeroMediaType = typeRaw === "video" ? "video" : "image";

  return {
    id: String(o.id || `hero-${index + 1}`).trim() || `hero-${index + 1}`,
    enabled: parseBool(o.enabled, true),
    mediaType,
    image: {
      url: String(imageRaw.url || "").trim(),
      alt: String(imageRaw.alt || d.image.alt).trim() || d.image.alt,
    },
    video: {
      url: String(videoRaw.url || "").trim(),
    },
    link: {
      href: String(linkRaw.href || d.link.href).trim() || d.link.href,
    },
    cta: {
      label: String(ctaRaw.label || d.cta.label).trim() || d.cta.label,
      show: parseBool(ctaRaw.show ?? ctaRaw.enabled, d.cta.show),
    },
  };
}

export function getActiveHeroSlides(hero: HeroSettings): HeroSlide[] {
  if (!hero.enabled) return [];
  return hero.slides.filter((s) => s.enabled && slideHasMedia(s));
}

export function normalizeHeroSettings(raw: unknown): HeroSettings {
  const d = DEFAULT_HERO;
  if (!raw || typeof raw !== "object") return d;

  const o = raw as Record<string, unknown>;
  const slidesRaw = Array.isArray(o.slides) ? o.slides : d.slides;
  const autoplayMs = Math.max(
    2000,
    Math.min(15000, Number(o.autoplayMs ?? o.autoplay_ms ?? d.autoplayMs) || d.autoplayMs),
  );

  const slides = slidesRaw
    .map((slide, i) => normalizeSlide(slide, i))
    .filter((slide) => slideHasMedia(slide));

  return {
    enabled: parseBool(o.enabled, d.enabled),
    version: String(o.version || d.version).trim() || d.version,
    autoplayMs,
    slides: slides.length ? slides : FALLBACK_HERO.slides,
  };
}

function getWordPressBase(): string {
  return (process.env.WC_API_BASE || process.env.WORDPRESS_API_URL || "").replace(
    /\/$/,
    "",
  );
}

export async function fetchHeroSettings(): Promise<HeroSettings> {
  const base = getWordPressBase();
  if (!base) return FALLBACK_HERO;

  try {
    const res = await fetch(`${base}/wp-json/hover/v1/hero`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`Hero API ${res.status}`);
    const data = await res.json();
    const hero = normalizeHeroSettings(data?.hero ?? data);
    return getActiveHeroSlides(hero).length ? hero : FALLBACK_HERO;
  } catch {
    return FALLBACK_HERO;
  }
}
