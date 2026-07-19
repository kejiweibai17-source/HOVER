export type CategoryTile = {
  label: string;
  heroText?: string;
  href: string;
  image: string;
  alt?: string;
};

export const FALLBACK_CATEGORY_TILES: CategoryTile[] = [
  {
    label: "TOPS",
    heroText: "ALL BLACK\nCOLLECTION",
    href: "/products?category=tops",
    image: "/images/hover/category-1.jpg",
  },
  {
    label: "HEADWEARS",
    href: "/products?category=headwear",
    image: "/images/hover/category-2.jpg",
  },
  {
    label: "SOCKS",
    href: "/products?category=socks",
    image: "/images/hover/category-3.jpg",
  },
  {
    label: "BAGS",
    href: "/products?category=bags",
    image: "/images/hover/category-2.jpg",
  },
];

function getWordPressBase(): string {
  return (process.env.WC_API_BASE || process.env.WORDPRESS_API_URL || "").replace(
    /\/$/,
    "",
  );
}

/**
 * 讀取後台「HOVER 分類格」設定（hover-category-grid-studio.php）。
 * 後台未啟用或無圖時回傳 fallback 靜態資料。
 */
export async function fetchCategoryTiles(): Promise<CategoryTile[]> {
  const base = getWordPressBase();
  if (!base) return FALLBACK_CATEGORY_TILES;

  try {
    const res = await fetch(`${base}/wp-json/hover/v1/category-grid`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`Category grid API ${res.status}`);
    const data = await res.json();
    const raw = data?.categoryGrid ?? data;
    if (!raw?.enabled || !Array.isArray(raw.tiles)) {
      return FALLBACK_CATEGORY_TILES;
    }

    const tiles: CategoryTile[] = raw.tiles
      .filter(
        (t: any) =>
          t && t.enabled !== false && typeof t?.image?.url === "string" && t.image.url.trim(),
      )
      .map((t: any) => ({
        label: String(t.label || "CATEGORY").trim() || "CATEGORY",
        heroText: String(t.heroText || "").trim() || undefined,
        href: String(t.href || "/products").trim() || "/products",
        image: String(t.image.url).trim(),
        alt: String(t.image?.alt || "").trim() || undefined,
      }));

    return tiles.length ? tiles : FALLBACK_CATEGORY_TILES;
  } catch {
    return FALLBACK_CATEGORY_TILES;
  }
}
