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

/**
 * 讀取後台「HOVER PEOPLE」設定（hover-people-studio.php）。
 * 後台未啟用或無圖時回傳 fallback 靜態圖。
 */
export async function fetchPeopleSlides(): Promise<PeopleSlide[]> {
  const base = getWordPressBase();
  if (!base) return FALLBACK_PEOPLE_SLIDES;

  try {
    const res = await fetch(`${base}/wp-json/hover/v1/people`, {
      next: { revalidate: 60 },
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
          s && s.enabled !== false && typeof s?.image?.url === "string" && s.image.url.trim(),
      )
      .map((s: any, i: number) => ({
        id: String(s.id || `people-${i + 1}`),
        src: String(s.image.url).trim(),
        alt: String(s.image?.alt || "").trim() || undefined,
        href: String(s.href || "").trim() || undefined,
      }));

    return slides.length ? slides : FALLBACK_PEOPLE_SLIDES;
  } catch {
    return FALLBACK_PEOPLE_SLIDES;
  }
}
