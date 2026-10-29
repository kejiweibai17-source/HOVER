export type PeopleSlide = {
  id: string;
  src: string;
  alt?: string;
  href?: string;
};

export const FALLBACK_PEOPLE_SLIDES: PeopleSlide[] = [
  "/images/hover/people-1.jpg",
  "/images/hover/people-2.jpg",
  "/images/hover/people-3.jpg",
  "/images/hover/people-4.jpg",
  "/images/hover/people-1.jpg",
  "/images/hover/people-2.jpg",
].map((src, i) => ({
  id: `people-${i}`,
  src,
  alt: `HOVER PEOPLE ${i + 1}`,
}));

function getWordPressBase(): string {
  return (process.env.WC_API_BASE || process.env.WORDPRESS_API_URL || "").replace(
    /\/$/,
    "",
  );
}

/** 本機相對路徑視為可用；遠端圖 HEAD 確認，避免媒體庫刪檔後前台整排死圖 */
async function isReachableImageUrl(src: string): Promise<boolean> {
  const url = String(src || "").trim();
  if (!url) return false;
  if (url.startsWith("/")) return true;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      headers: { "User-Agent": "HOVER-PeopleCheck/1.0" },
      cache: "no-store",
    });
    clearTimeout(timer);
    if (res.ok) return true;

    // 少數主機不支援 HEAD：再試 GET（只取 headers）
    if (res.status === 405 || res.status === 403) {
      const getRes = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "HOVER-PeopleCheck/1.0",
          Range: "bytes=0-0",
        },
        cache: "no-store",
      });
      return getRes.ok || getRes.status === 206;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * 讀取後台「HOVER PEOPLE」設定（hover-people-studio.php）。
 * 後台未啟用、無圖、或媒體檔已 404 時回傳 fallback 靜態圖。
 */
export async function fetchPeopleSlides(): Promise<PeopleSlide[]> {
  const base = getWordPressBase();
  if (!base) return FALLBACK_PEOPLE_SLIDES;

  try {
    const res = await fetch(`${base}/wp-json/hover/v1/people`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`People API ${res.status}`);
    const data = await res.json();
    const raw = data?.people ?? data;
    if (!raw?.enabled || !Array.isArray(raw.slides)) {
      return FALLBACK_PEOPLE_SLIDES;
    }

    const slides: PeopleSlide[] = raw.slides
      .filter(
        (s: any) =>
          s &&
          s.enabled !== false &&
          typeof s?.image?.url === "string" &&
          s.image.url.trim(),
      )
      .map((s: any, i: number) => ({
        id: String(s.id || `people-${i + 1}`),
        src: String(s.image.url).trim(),
        alt: String(s.image?.alt || "").trim() || undefined,
        href: String(s.href || "").trim() || undefined,
      }));

    if (!slides.length) return FALLBACK_PEOPLE_SLIDES;

    const checks = await Promise.all(
      slides.map(async (slide) => ({
        slide,
        ok: await isReachableImageUrl(slide.src),
      })),
    );
    const alive = checks.filter((c) => c.ok).map((c) => c.slide);
    if (!alive.length) {
      console.warn(
        "[people] 後台圖片全部無法存取（可能媒體已刪），改用本機備援圖",
      );
      return FALLBACK_PEOPLE_SLIDES;
    }
    if (alive.length < slides.length) {
      console.warn(
        `[people] ${slides.length - alive.length} 張 PEOPLE 圖 404，已略過`,
      );
    }
    return alive;
  } catch {
    return FALLBACK_PEOPLE_SLIDES;
  }
}
