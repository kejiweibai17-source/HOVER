import { isColorAttributeName, isSizeAttributeName } from "./productColors";

export type ProductVariation = {
  id: number;
  price: number;
  regularPrice: number;
  salePrice: number | null;
  stockStatus: string;
  attributes: Record<string, string>;
};

export function parseWooVariation(raw: {
  id?: number | string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  stock_status?: string;
  attributes?: Array<{ name?: string; option?: string }>;
}): ProductVariation {
  const attributes: Record<string, string> = {};
  for (const attr of raw.attributes || []) {
    const name = String(attr.name || "").trim();
    const option = String(attr.option || "").trim();
    if (name && option) attributes[name] = option;
  }

  const regularPrice = Number(raw.regular_price || raw.price || 0);
  const saleRaw = raw.sale_price ? Number(raw.sale_price) : null;
  const salePrice =
    saleRaw && saleRaw > 0 && saleRaw < regularPrice ? saleRaw : null;
  const price = salePrice ?? Number(raw.price || regularPrice || 0);

  return {
    id: Number(raw.id),
    price,
    regularPrice,
    salePrice,
    stockStatus: String(raw.stock_status || "instock"),
    attributes,
  };
}

export function getVariationAttribute(
  variation: ProductVariation,
  matcher: (name: string) => boolean,
): string {
  for (const [name, value] of Object.entries(variation.attributes)) {
    if (matcher(name)) return value;
  }
  return "";
}

export function getVariationColor(variation: ProductVariation): string {
  return getVariationAttribute(variation, isColorAttributeName);
}

export function getVariationSize(variation: ProductVariation): string {
  return getVariationAttribute(variation, isSizeAttributeName);
}

const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "XXL", "3XL", "XXXL"];

export function sortProductSizes(sizes: string[]): string[] {
  return sizes
    .map((size, index) => ({ size, index }))
    .sort((a, b) => {
      const aRank = SIZE_ORDER.indexOf(a.size.trim().toUpperCase());
      const bRank = SIZE_ORDER.indexOf(b.size.trim().toUpperCase());

      if (aRank === -1 && bRank === -1) return a.index - b.index;
      if (aRank === -1) return 1;
      if (bRank === -1) return -1;
      return aRank - bRank;
    })
    .map(({ size }) => size);
}

export function findMatchingVariation(
  variations: ProductVariation[],
  color: string,
  size: string,
): ProductVariation | null {
  if (!variations.length) return null;

  return (
    variations.find((variation) => {
      const variationColor = getVariationColor(variation);
      const variationSize = getVariationSize(variation);
      const colorMatch = !color || !variationColor || variationColor === color;
      const sizeMatch = !size || !variationSize || variationSize === size;
      return colorMatch && sizeMatch;
    }) || null
  );
}

/** 依所選顏色，從變體列出可選尺寸 */
export function getSizesForColor(
  variations: ProductVariation[],
  color: string,
  fallback: string[],
): string[] {
  if (!variations.length) return sortProductSizes(fallback);

  const sizes: string[] = [];
  const seen = new Set<string>();

  for (const variation of variations) {
    if (color && getVariationColor(variation) !== color) continue;
    const size = getVariationSize(variation);
    if (!size || seen.has(size)) continue;
    seen.add(size);
    sizes.push(size);
  }

  return sortProductSizes(sizes.length ? sizes : fallback);
}
