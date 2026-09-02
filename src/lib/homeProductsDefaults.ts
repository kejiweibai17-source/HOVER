export type HomeCarouselProduct = {
  id: number | string;
  href: string;
  name: string;
  image: string;
  gallery?: string[];
  /** 後台商品圖庫第一張，給卡片 hover */
  hoverImage?: string;
  isNew?: boolean;
  originalPrice: number;
  salePrice?: number | null;
  soldOut?: boolean;
  colorLabel?: string;
  colorHex?: string;
  colors?: { label: string; hex: string }[];
  description?: string;
};

export const FALLBACK_HOME_PRODUCTS: HomeCarouselProduct[] = [
  {
    id: "hover-product-1",
    href: "/products/chambray-ribbon-shirt",
    name: "ChambrayRIBBONSHIRT",
    image: "/images/hover/product-1.jpg",
    isNew: false,
    originalPrice: 1280,
    colorLabel: "藍",
    colorHex: "#9ab3d4",
    gallery: [
      "/images/hover/product-1.jpg",
      "/images/hover/product-2.jpg",
      "/images/hover/product-3.jpg",
      "/images/hover/product-4.jpg",
    ],
  },
  {
    id: "hover-product-2",
    href: "/products/chambray-ribbon-shirt-2",
    name: "ChambrayRIBBONSHIRT",
    image: "/images/hover/product-2.jpg",
    isNew: true,
    originalPrice: 1280,
    soldOut: true,
    colorLabel: "藍",
    colorHex: "#9ab3d4",
    gallery: [
      "/images/hover/product-2.jpg",
      "/images/hover/product-1.jpg",
    ],
  },
  {
    id: "hover-product-3",
    href: "/products/chambray-ribbon-shirt-3",
    name: "ChambrayRIBBONSHIRT",
    image: "/images/hover/product-3.jpg",
    isNew: true,
    originalPrice: 1280,
    colorLabel: "藍",
    colorHex: "#b8cad8",
    gallery: [
      "/images/hover/product-3.jpg",
      "/images/hover/people-3.jpg",
    ],
  },
  {
    id: "hover-product-4",
    href: "/products/chambray-ribbon-shirt-4",
    name: "ChambrayRIBBONSHIRT",
    image: "/images/hover/product-4.jpg",
    isNew: false,
    originalPrice: 1280,
    soldOut: true,
    colorLabel: "藍",
    colorHex: "#9ab3d4",
    gallery: ["/images/hover/product-4.jpg", "/images/hover/people-4.jpg"],
  },
];

function getWordPressBase(): string {
  return (process.env.WC_API_BASE || process.env.WORDPRESS_API_URL || "").replace(
    /\/$/,
    "",
  );
}

function normalizeProduct(raw: unknown, index: number): HomeCarouselProduct | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const href = String(o.href || "").trim();
  const image = String(o.image || "").trim();
  const name = String(o.name || "").trim();
  if (!href || !image || !name) return null;

  const gallery = Array.isArray(o.gallery)
    ? o.gallery.map((src) => String(src || "").trim()).filter(Boolean)
    : [image];
  const hoverImage = String(o.hoverImage || "").trim();

  const originalPrice = Number(o.originalPrice);
  const saleRaw = o.salePrice == null || o.salePrice === "" ? null : Number(o.salePrice);

  return {
    id: (o.id as number | string) || `home-product-${index + 1}`,
    href,
    name,
    image,
    gallery: gallery.length ? gallery : [image],
    hoverImage: hoverImage || undefined,
    isNew: Boolean(o.isNew),
    originalPrice: Number.isFinite(originalPrice) ? originalPrice : 0,
    salePrice: saleRaw != null && Number.isFinite(saleRaw) ? saleRaw : null,
    soldOut: Boolean(o.soldOut),
    colorLabel: String(o.colorLabel || "").trim() || undefined,
    colorHex: String(o.colorHex || "").trim() || undefined,
    description: String(o.description || "").trim() || undefined,
  };
}

function normalizeList(raw: unknown): HomeCarouselProduct[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => normalizeProduct(item, i))
    .filter((item): item is HomeCarouselProduct => Boolean(item));
}

export async function fetchHomeCarouselProducts(): Promise<{
  newArrivals: HomeCarouselProduct[];
  bestSeller: HomeCarouselProduct[];
}> {
  const fallback = {
    newArrivals: FALLBACK_HOME_PRODUCTS,
    bestSeller: FALLBACK_HOME_PRODUCTS,
  };

  const base = getWordPressBase();
  if (!base) return fallback;

  try {
    const res = await fetch(`${base}/wp-json/hover/v1/home-products`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`Home products API ${res.status}`);
    const data = await res.json();
    const raw = data?.homeProducts ?? data;
    if (!raw?.enabled) {
      return { newArrivals: [], bestSeller: [] };
    }

    return {
      newArrivals:
        raw.newArrivals?.enabled === false
          ? []
          : normalizeList(raw.newArrivals?.products),
      bestSeller:
        raw.bestSeller?.enabled === false
          ? []
          : normalizeList(raw.bestSeller?.products),
    };
  } catch {
    return fallback;
  }
}
