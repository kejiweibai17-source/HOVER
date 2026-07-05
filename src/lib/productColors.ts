export type ProductColor = {
  label: string;
  hex: string;
};

export const DEFAULT_PRODUCT_COLORS: ProductColor[] = [
  { label: "紅", hex: "#b20000" },
  { label: "黑", hex: "#111111" },
  { label: "粉", hex: "#ffe0f4" },
  { label: "白", hex: "#ffffff" },
];

const COLOR_NAME_HINTS: Record<string, string> = {
  黑: "#111111",
  黑色: "#111111",
  白: "#ffffff",
  白色: "#ffffff",
  紅: "#b20000",
  紅色: "#b20000",
  粉: "#ffe0f4",
  粉色: "#ffe0f4",
  粉紅: "#ffe0f4",
  藍: "#9ab3d4",
  藍色: "#9ab3d4",
  軍綠: "#4a5d3f",
  綠: "#4a7c59",
  綠色: "#4a7c59",
  米色: "#e8dcc8",
  米: "#e8dcc8",
  卡其: "#c4b896",
  灰: "#888888",
  灰色: "#888888",
  深灰: "#555555",
  淺灰: "#c8ccd0",
  黃: "#f5d547",
  黃色: "#f5d547",
  橘: "#e67e22",
  橘色: "#e67e22",
  紫: "#7b5ea7",
  紫色: "#7b5ea7",
  棕: "#8b5a2b",
  棕色: "#8b5a2b",
  深藍: "#1a3a5c",
  海軍藍: "#1a3a5c",
};

const COLOR_ATTR_NAMES = new Set([
  "顏色",
  "颜色",
  "color",
  "colour",
  "colors",
  "色彩",
  "pa_color",
  "pa_顏色",
]);

const SIZE_ATTR_NAMES = new Set([
  "尺寸",
  "size",
  "sizes",
  "pa_size",
  "pa_尺寸",
]);

function normalizeAttrName(name: string): string {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/^pa_/, "");
}

export function isColorAttributeName(name: string): boolean {
  const raw = String(name || "").trim();
  const normalized = normalizeAttrName(raw);
  return (
    COLOR_ATTR_NAMES.has(raw) ||
    COLOR_ATTR_NAMES.has(normalized) ||
    normalized === "color" ||
    raw === "顏色"
  );
}

export function isSizeAttributeName(name: string): boolean {
  const raw = String(name || "").trim();
  const normalized = normalizeAttrName(raw);
  return (
    SIZE_ATTR_NAMES.has(raw) ||
    SIZE_ATTR_NAMES.has(normalized) ||
    normalized === "size" ||
    raw === "尺寸"
  );
}

export function guessColorHex(label: string): string {
  const key = String(label || "").trim();
  if (!key) return "#cccccc";
  if (COLOR_NAME_HINTS[key]) return COLOR_NAME_HINTS[key];
  const lower = key.toLowerCase();
  if (COLOR_NAME_HINTS[lower]) return COLOR_NAME_HINTS[lower];
  if (/^#[0-9a-f]{3,8}$/i.test(key)) return key;
  return "#cccccc";
}

function findAttribute(
  attributes: Array<{ name: string; options: string[] }> | undefined,
  matcher: (name: string) => boolean,
) {
  return (attributes || []).find((attr) => matcher(attr.name));
}

export function extractProductColors(product: {
  attributes?: Array<{ name: string; options: string[] }>;
  hover_color_swatches?: Record<string, string> | null;
  colors?: ProductColor[];
}): ProductColor[] {
  if (Array.isArray(product.colors) && product.colors.length > 0) {
    return product.colors;
  }

  const colorAttr = findAttribute(product.attributes, isColorAttributeName);
  if (!colorAttr?.options?.length) {
    return DEFAULT_PRODUCT_COLORS;
  }

  const swatches = product.hover_color_swatches || {};
  return colorAttr.options
    .map((label) => String(label || "").trim())
    .filter(Boolean)
    .map((label) => ({
      label,
      hex: swatches[label] || guessColorHex(label),
    }));
}

export function extractProductSizes(
  attributes?: Array<{ name: string; options: string[] }>,
  fallback: string[] = ["S", "M", "L", "XL"],
): string[] {
  const sizeAttr = findAttribute(attributes, isSizeAttributeName);
  const options = (sizeAttr?.options || [])
    .map((size) => String(size || "").trim())
    .filter(Boolean);
  return options.length ? options : fallback;
}

export function normalizeColorSwatches(
  raw: unknown,
): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [label, hex] of Object.entries(raw as Record<string, unknown>)) {
    const key = String(label || "").trim();
    const value = String(hex || "").trim();
    if (!key || !/^#[0-9a-f]{3,8}$/i.test(value)) continue;
    out[key] = value;
  }
  return out;
}

export function extractColorSwatchesFromWooProduct(product: {
  hover_color_swatches?: unknown;
  meta_data?: Array<{ key?: string; value?: unknown }>;
}): Record<string, string> {
  if (product.hover_color_swatches) {
    return normalizeColorSwatches(product.hover_color_swatches);
  }
  const meta = product.meta_data?.find((m) => m.key === "hover_color_swatches");
  if (meta?.value) {
    return normalizeColorSwatches(meta.value);
  }
  return {};
}
