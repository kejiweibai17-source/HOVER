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
 * 卡片 hover：用後台「商品圖庫」第二張。
 * 若沒有第二張，改用圖庫中第一張與主圖不同的。
 */
export function pickProductHoverImage(
  images: ProductCardImage[] | undefined,
): ProductCardImage | undefined {
  if (!images?.length) return undefined;
  const featured = images[0];
  const gallery = images.slice(1).filter((img) => img?.src);
  if (!gallery.length) return undefined;

  const second = gallery[1];
  if (second?.src && !isSameCardImage(featured, second)) return second;

  return gallery.find((img) => !isSameCardImage(featured, img));
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
