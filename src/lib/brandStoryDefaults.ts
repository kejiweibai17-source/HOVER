export type BrandStorySlide = {
  id: string;
  src: string;
  alt: string;
  href?: string;
};

export const FALLBACK_BRAND_STORY_SLIDES: BrandStorySlide[] = [
  {
    id: "brand-story-1",
    src: "https://united-arrows-global.com/cdn/shop/files/bnr_global_1600_900_w.jpg?v=1782724871&width=2400",
    alt: "HOVER brand story 1",
    href: "/products",
  },
  {
    id: "brand-story-2",
    src: "https://united-arrows-global.com/cdn/shop/files/collection_top_1600_900.jpg?v=1782727109&width=2000",
    alt: "HOVER brand story 2",
    href: "/products",
  },
  {
    id: "brand-story-3",
    src: "https://united-arrows-global.com/cdn/shop/files/WOMEN_PC_b0601636-c7ee-401e-a411-8cb83323cbef.jpg?v=1779843749&width=2000",
    alt: "HOVER brand story 3",
    href: "/products",
  },
  {
    id: "brand-story-4",
    src: "https://united-arrows-global.com/cdn/shop/files/MEN_PC_7c49d7ce-4819-48ea-a1ba-1b91031081d1.jpg?v=1779843749&width=2000",
    alt: "HOVER brand story 4",
    href: "/products",
  },
];

function getWordPressBase(): string {
  return (process.env.WC_API_BASE || process.env.WORDPRESS_API_URL || "").replace(
    /\/$/,
    "",
  );
}

/**
 * 讀取後台「HOVER 品牌輪播」設定（hover-brand-story-studio.php）。
 * 後台未啟用或無圖時回傳 fallback 靜態圖。
 */
export async function fetchBrandStorySlides(): Promise<BrandStorySlide[]> {
  const base = getWordPressBase();
  if (!base) return FALLBACK_BRAND_STORY_SLIDES;

  try {
    const res = await fetch(`${base}/wp-json/hover/v1/brand-story`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`Brand story API ${res.status}`);
    const data = await res.json();
    const raw = data?.brandStory ?? data;
    if (!raw?.enabled || !Array.isArray(raw.slides)) {
      return FALLBACK_BRAND_STORY_SLIDES;
    }

    const slides: BrandStorySlide[] = raw.slides
      .filter(
        (s: any) =>
          s && s.enabled !== false && typeof s?.image?.url === "string" && s.image.url.trim(),
      )
      .map((s: any, i: number) => ({
        id: String(s.id || `brand-story-${i + 1}`),
        src: String(s.image.url).trim(),
        alt: String(s.image?.alt || "HOVER brand story").trim() || "HOVER brand story",
        href: String(s.href || "").trim() || undefined,
      }));

    return slides.length ? slides : FALLBACK_BRAND_STORY_SLIDES;
  } catch {
    return FALLBACK_BRAND_STORY_SLIDES;
  }
}
