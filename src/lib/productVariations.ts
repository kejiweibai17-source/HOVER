import { isColorAttributeName, isSizeAttributeName } from "./productColors";

export type ProductVariation = {
  id: number;
  price: number;
  regularPrice: number;
  salePrice: number | null;
  stockStatus: string;
  attributes: Record<string, string>;
};

/** WooCommerce「預設表單值」→ 前台初始選取 */
export type ProductDefaultAttributes = {
  color?: string;
  size?: string;
};

export function parseDefaultAttributes(
  raw: Array<{ name?: string; option?: string }> | undefined | null,
): ProductDefaultAttributes {
  const result: ProductDefaultAttributes = {};
  for (const attr of raw || []) {
    const name = String(attr?.name || "").trim();
    const option = String(attr?.option || "").trim();
    if (!name || !option) continue;
    if (isColorAttributeName(name)) result.color = option;
    else if (isSizeAttributeName(name)) result.size = option;
  }
  return result;
}

/** 在顏色清單中找到與預設值對應的 label（允許「粉」對「粉色」） */
export function resolveInitialColorLabel(
  colors: Array<{ label: string }>,
  defaultColor?: string,
): string {
  if (!colors.length) return "";
  const target = String(defaultColor || "").trim();
  if (!target) return colors[0].label;

  const exact = colors.find((c) => c.label === target);
  if (exact) return exact.label;

  const fuzzy = colors.find((c) => {
    const a = c.label.trim().toLowerCase();
    const b = target.toLowerCase();
    return a === b || a.includes(b) || b.includes(a);
  });
  return fuzzy?.label || colors[0].label;
}

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
