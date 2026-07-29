import { isColorAttributeName } from "./productColors";

export type GalleryImage = {
  id?: number;
  src: string;
  alt?: string;
};

export type ColorGalleries = Record<string, GalleryImage[]>;

export type WooVariationRow = {
  attributes?: Array<{ name?: string; option?: string }>;
  image?: {
    src?: string;
    alt?: string;
    sizes?: Partial<Record<string, string | null>>;
  } | null;
  hover_variation_gallery?: GalleryImage[];
};

function optimizeGallerySrc(src: string): string {
  // 顏色圖庫／內頁：保持原圖。臆造 -1024x1024 等後綴常 404。
  // 列表縮圖請用 toOptimizedImageUrl(..., "card")。
  return src;
}

export function normalizeColorGalleries(raw: unknown): ColorGalleries {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};

  const out: ColorGalleries = {};
  for (const [color, images] of Object.entries(raw as Record<string, unknown>)) {
    const key = String(color || "").trim();
    if (!key || !Array.isArray(images)) continue;
    const list = images
      .map((img) => {
        if (!img || typeof img !== "object") return null;
        const row = img as Record<string, unknown>;
        const src = String(row.src || "").trim();
        if (!src) return null;
        return {
          id: row.id ? Number(row.id) : undefined,
          src: optimizeGallerySrc(src),
          alt: String(row.alt || "").trim() || undefined,
        };
      })
      .filter(Boolean) as GalleryImage[];
    if (list.length) out[key] = list;
  }
  return out;
}

export function extractColorGalleriesFromWooProduct(product: {
  hover_color_galleries?: unknown;
}): ColorGalleries {
  return normalizeColorGalleries(product.hover_color_galleries);
}

function extractVariationColor(
  attributes?: Array<{ name?: string; option?: string }>,
): string {
  const colorAttr = (attributes || []).find((attr) =>
    isColorAttributeName(String(attr.name || "")),
  );
  return String(colorAttr?.option || "").trim();
}

/** 從變體 REST 資料組出依顏色分組的圖庫 */
export function buildColorGalleriesFromVariations(
  variations: WooVariationRow[],
): ColorGalleries {
  const out: ColorGalleries = {};

  for (const variation of variations) {
    const color = extractVariationColor(variation.attributes);
    if (!color) continue;

    const gallery = Array.isArray(variation.hover_variation_gallery)
      ? variation.hover_variation_gallery
          .map((image) => {
            const src = String(image?.src || "").trim();
            if (!src) return null;
            return {
              id: image.id ? Number(image.id) : undefined,
              src: optimizeGallerySrc(src),
              alt: String(image.alt || "").trim() || undefined,
            };
          })
          .filter(Boolean)
      : [];

    const images =
      gallery.length > 0
        ? (gallery as GalleryImage[])
        : variation.image?.src
          ? [
              {
                src: optimizeGallerySrc(String(variation.image.src)),
                alt: String(variation.image.alt || "").trim() || undefined,
              },
            ]
          : [];

    if (!images.length) continue;

    if (!out[color] || images.length > out[color].length) {
      out[color] = images;
    }
  }

  return out;
}

export function mergeColorGalleries(
  primary: ColorGalleries,
  fallback: ColorGalleries,
): ColorGalleries {
  const merged = { ...fallback };
  for (const [color, images] of Object.entries(primary)) {
    if (images?.length) merged[color] = images;
  }
  return merged;
}

export function resolveGalleryForColor(
  color: string,
  colorGalleries: ColorGalleries,
  fallback: string[],
): string[] {
  const key = String(color || "").trim();
  const images = colorGalleries[key];
  if (images?.length) {
    return images.map((img) => img.src).filter(Boolean);
  }
  return fallback;
}
