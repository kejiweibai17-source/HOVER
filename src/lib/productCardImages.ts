/** Woo REST images[0] = 商品圖片；images[1+] = 商品圖庫（順序與後台相同） */

export type ProductCardImage = {
  src: string;
  alt?: string;
  id?: number;
};

function stripSizeSuffix(src: string): string {
  return String(src || "")
    .split("?")[0]
    .replace(/-\d+x\d+(?=\.[a-zA-Z]+$)/i, "");
}

function isSameCardImage(a?: ProductCardImage | null, b?: ProductCardImage | null): boolean {
  if (!a?.src || !b?.src) return false;
  if (a.id && b.id && a.id === b.id) return true;
  return stripSizeSuffix(a.src) === stripSizeSuffix(b.src);
}

/**
 * 卡片 hover：後台「產品圖片」(images[0]) 為預設；
 * hover 換成「商品圖庫」第一張 (images[1])。
 */
export function pickProductHoverImage(
  images: ProductCardImage[] | undefined,
): ProductCardImage | undefined {
  if (!images?.length) return undefined;
  const featured = images[0];
  const firstGallery = images[1];
  if (firstGallery?.src && !isSameCardImage(featured, firstGallery)) {
    return firstGallery;
  }

  return images.slice(1).find((img) => img?.src && !isSameCardImage(featured, img));
}

/** 產品內頁圖庫：僅商品圖庫 images[1..]，順序同後台，不含產品圖片 images[0] */
export function productDetailGallerySources<T extends { src?: string }>(
  images: T[] | undefined,
): T[] {
  if (!Array.isArray(images) || images.length <= 1) return [];
  return images.slice(1);
}

export function pickProductHoverSrc(
  featuredSrc: string,
  gallery?: string[],
  explicitHover?: string | null,
): string | undefined {
  const hover = String(explicitHover || "").trim();
  if (hover && stripSizeSuffix(hover) !== stripSizeSuffix(featuredSrc)) {
    return hover;
  }

  const fromGallery = (gallery || []).filter(Boolean);
  const looksLikeWooImages =
    fromGallery.length > 0 &&
    stripSizeSuffix(fromGallery[0]) === stripSizeSuffix(featuredSrc);

  const images: ProductCardImage[] = looksLikeWooImages
    ? fromGallery.map((src) => ({ src }))
    : [{ src: featuredSrc }, ...fromGallery.map((src) => ({ src }))];

  return pickProductHoverImage(images)?.src;
}
