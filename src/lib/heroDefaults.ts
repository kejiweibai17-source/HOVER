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
  /** 手機版主圖；空白時前台沿用 image */
  imageMobile: HeroSlideImage;
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
    imageMobile: {
      url: "",
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

/** 從 watch / youtu.be / embed / shorts／iframe HTML 解析 11 碼 video id */
export function parseYoutubeVideoId(url: string): string | null {
  const raw = String(url || "").trim();
  if (!raw) return null;
  if (/^[\w-]{11}$/.test(raw)) return raw;

  const loose = raw.match(
    /(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:[^"'<\s]*?[?&])?v=|embed\/|shorts\/|live\/|v\/)|[?&]v=)([\w-]{11})/,
  );
  if (loose?.[1]) return loose[1];

  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0] || "";
      return /^[\w-]{11}$/.test(id) ? id : null;
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "music.youtube.com" ||
      host === "youtube-nocookie.com"
    ) {
      const v = u.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;

      const match = u.pathname.match(
        /^\/(?:embed|shorts|live|v)\/([\w-]{11})(?:\/|$)/,
      );
      if (match?.[1]) return match[1];
    }
  } catch {
    return null;
  }

  return null;
}

export function isHeroYoutubeSlide(slide: HeroSlide): boolean {
  return (
    slide.mediaType === "video" &&
    Boolean(parseYoutubeVideoId(slide.video.url))
  );
}

/** 上傳／媒體庫影片（非 YouTube） */
export function isHeroFileVideoSlide(slide: HeroSlide): boolean {
  return (
    slide.mediaType === "video" &&
    Boolean(slide.video.url.trim()) &&
    !parseYoutubeVideoId(slide.video.url)
  );
}

/** 影片 slide（YouTube 或上傳檔）：停留該張並自身無限循環，不自動切下一張 */
export function isHeroVideoSlide(slide: HeroSlide): boolean {
  return isHeroYoutubeSlide(slide) || isHeroFileVideoSlide(slide);
}

/** YouTube 自動產生的封面（更換成上傳影片後不應再當 poster） */
export function isYoutubeThumbUrl(url: string): boolean {
  return /ytimg\.com|hqdefault|maxresdefault|mqdefault|sddefault/i.test(
    String(url || ""),
  );
}

/**
 * Hero 影片一律用原始檔網址播放（不經 Photon quality／縮圖）。
 * 若誤存成 i0.wp.com／cdn 形式，還原回原站 uploads。
 */
export function resolveHeroVideoUrl(url: string): string {
  const raw = String(url || "").trim();
  if (!raw) return "";
  try {
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    if (
      host === "i0.wp.com" ||
      host === "i1.wp.com" ||
      host === "i2.wp.com" ||
      host === "i3.wp.com"
    ) {
      const parts = u.pathname.replace(/^\//, "").split("/");
      if (parts.length >= 2) {
        const originHost = parts[0];
        const path = `/${parts.slice(1).join("/")}`;
        return `https://${originHost}${path}`;
      }
    }
    // 清掉可能誤加的圖片壓縮參數
    if (
      u.searchParams.has("quality") ||
      u.searchParams.has("w") ||
      u.searchParams.has("h")
    ) {
      u.searchParams.delete("quality");
      u.searchParams.delete("w");
      u.searchParams.delete("h");
      u.searchParams.delete("resize");
      u.searchParams.delete("fit");
      return u.toString();
    }
  } catch {
    return raw;
  }
  return raw;
}

/** YouTube 封面：優先 maxres，失敗時瀏覽器仍可退回 hq */
export function getYoutubePosterUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
}

/** Hero YouTube 略過片頭秒數 */
export const HERO_YOUTUBE_START_SEC = 5;

/** muted + loop 需帶 playlist=同一支 video id */
export function buildYoutubeEmbedSrc(
  videoId: string,
  {
    autoplay = false,
    origin,
    startSec = HERO_YOUTUBE_START_SEC,
  }: { autoplay?: boolean; origin?: string; startSec?: number } = {},
): string {
  const params = new URLSearchParams({
    autoplay: autoplay ? "1" : "0",
    mute: "1",
    controls: "0",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    loop: "1",
    playlist: videoId,
    enablejsapi: "1",
    iv_load_policy: "3",
    disablekb: "1",
    fs: "0",
    start: String(Math.max(0, Math.floor(startSec))),
    // 盡力請求高畫質（YouTube 仍可能依頻寬自動降級）
    vq: "hd1080",
    hd: "1",
  });
  if (origin) params.set("origin", origin);
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
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
  const imageMobileRaw =
    (o.imageMobile as Record<string, unknown>) ||
    (o.image_mobile as Record<string, unknown>) ||
    {};
  const videoRaw = (o.video as Record<string, unknown>) || {};
  const linkRaw = (o.link as Record<string, unknown>) || {};
  const ctaRaw = (o.cta as Record<string, unknown>) || {};
  const typeRaw = String(o.mediaType || o.media_type || "image");
  const mediaType: HeroMediaType = typeRaw === "video" ? "video" : "image";
  const desktopAlt =
    String(imageRaw.alt || d.image.alt).trim() || d.image.alt;

  return {
    id: String(o.id || `hero-${index + 1}`).trim() || `hero-${index + 1}`,
    enabled: parseBool(o.enabled, true),
    mediaType,
    image: {
      url: String(imageRaw.url || "").trim(),
      alt: desktopAlt,
    },
    imageMobile: {
      url: String(imageMobileRaw.url || "").trim(),
      alt:
        String(imageMobileRaw.alt || desktopAlt).trim() || desktopAlt,
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

/** 手機畫面使用的主圖（未設手機圖時沿用桌機） */
export function resolveHeroImageUrl(
  slide: HeroSlide,
  viewport: "desktop" | "mobile" = "desktop",
): string {
  if (viewport === "mobile" && slide.imageMobile.url.trim()) {
    return slide.imageMobile.url.trim();
  }
  return slide.image.url.trim();
}

export function resolveHeroImageAlt(
  slide: HeroSlide,
  viewport: "desktop" | "mobile" = "desktop",
): string {
  if (viewport === "mobile" && slide.imageMobile.alt.trim()) {
    return slide.imageMobile.alt.trim();
  }
  return slide.image.alt.trim() || "HOVER";
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
