export type ProductColor = {
  label: string;
  /** 主色（雙色時為第一色；相容舊呼叫） */
  hex: string;
  /** 1～2 色；雙色組合商品用對角色票 */
  hexes: string[];
  /** 有值時：點色票導向該獨立商品頁（同款分色） */
  slug?: string;
  productId?: number;
  image?: string;
};

export type ColorSibling = {
  id: number;
  slug: string;
  name?: string;
  color: string;
  hex: string;
  image?: string;
};

const HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

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
  米白: "#e8dfd0",
  奶茶: "#d2c0a8",
  象牙: "#d2c0a8",
  象牙白: "#d2c0a8",
  ivory: "#d2c0a8",
  卡其: "#c4b896",
  杏: "#e8d5b7",
  駝: "#c19a6b",
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
  藏青: "#1a2744",
};

/** 後端推斷失敗時會回 #cccccc；前台視為「未知」再猜一次 */
function isUnknownSwatchHex(hex: string): boolean {
  return !hex || /^#c{3,8}$/i.test(hex.trim());
}

/** 單一色名 → hex（不含雙色切割） */
function guessSingleColorHex(label: string): string {
  const key = String(label || "").trim();
  if (!key) return "#cccccc";
  if (COLOR_NAME_HINTS[key]) return COLOR_NAME_HINTS[key];
  const lower = key.toLowerCase();
  if (COLOR_NAME_HINTS[lower]) return COLOR_NAME_HINTS[lower];
  if (HEX_RE.test(key)) return key.toLowerCase();
  return "#cccccc";
}

/** 「黑白」「紅白」這類無斜線雙色名 → 拆成兩色（已知單色名如粉紅不拆） */
function splitConcatenatedColorLabel(label: string): [string, string] | null {
  const key = String(label || "").trim();
  if (!key || COLOR_NAME_HINTS[key] || COLOR_NAME_HINTS[key.toLowerCase()]) {
    return null;
  }
  const names = Object.keys(COLOR_NAME_HINTS).sort((a, b) => b.length - a.length);
  for (const first of names) {
    if (!key.startsWith(first)) continue;
    const rest = key.slice(first.length);
    if (!rest) continue;
    for (const second of names) {
      if (rest === second) return [first, second];
    }
  }
  return null;
}

/** 色名 → 1～2 色（「黑/白」「黑白」→ [#111, #fff]） */
export function guessColorHexes(label: string): string[] {
  const key = String(label || "").trim();
  if (!key) return ["#cccccc"];
  if (HEX_RE.test(key)) return [key.toLowerCase()];
  // 已知單色名（粉紅、酒紅等）不拆
  if (COLOR_NAME_HINTS[key] || COLOR_NAME_HINTS[key.toLowerCase()]) {
    return [guessSingleColorHex(key)];
  }
  if (/[/／]/.test(key)) {
    const parts = key
      .split(/[/／]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => guessSingleColorHex(part));
    if (parts.length >= 2) return parts;
    if (parts.length === 1) return parts;
  }
  const concat = splitConcatenatedColorLabel(key);
  if (concat) {
    return [guessSingleColorHex(concat[0]), guessSingleColorHex(concat[1])];
  }
  return [guessSingleColorHex(key)];
}

/** 相容舊呼叫：回傳主色；雙色標籤回傳第一色 */
export function guessColorHex(label: string): string {
  return guessColorHexes(label)[0] || "#cccccc";
}

/** 解析色票字串（單色或「#111/#fff」／「黑/白」「黑白」猜色），最多兩色 */
export function parseSwatchHexes(
  value: string | null | undefined,
  labelFallback = "",
): string[] {
  const raw = String(value || "").trim();
  const fromValue: string[] = [];
  if (raw) {
    const parts = raw
      .split(/[/／]/)
      .map((part) => part.trim())
      .filter(Boolean)
      .slice(0, 2);
    for (const part of parts) {
      if (HEX_RE.test(part)) {
        fromValue.push(part.toLowerCase());
        continue;
      }
      const guessed = guessSingleColorHex(part);
      if (!isUnknownSwatchHex(guessed)) fromValue.push(guessed);
    }
  }
  const fromLabel = labelFallback ? guessColorHexes(labelFallback) : [];
  // 後台已明確存雙色 → 以存檔為準
  if (fromValue.length >= 2) return fromValue.slice(0, 2);
  // 色名是雙色組合、但 meta 只存了第一色 → 仍顯示雙色意象
  if (fromLabel.length >= 2) return fromLabel.slice(0, 2);
  if (fromValue.length === 1) return fromValue;
  if (fromLabel.length) return fromLabel;
  return ["#cccccc"];
}

export function formatSwatchHexes(hexes: string[]): string {
  const clean = (hexes || [])
    .map((h) => String(h || "").trim().toLowerCase())
    .filter((h) => HEX_RE.test(h))
    .slice(0, 2);
  if (clean.length >= 2) return `${clean[0]}/${clean[1]}`;
  return clean[0] || "#cccccc";
}

/** 雙色對角色票背景 */
export function colorSwatchBackground(hexes: string[]): string {
  const clean = (hexes || []).filter(Boolean).slice(0, 2);
  if (clean.length >= 2) {
    return `linear-gradient(135deg, ${clean[0]} 50%, ${clean[1]} 50%)`;
  }
  return clean[0] || "#cccccc";
}

function withHexes(
  color: Omit<ProductColor, "hexes"> & { hexes?: string[] },
): ProductColor {
  const hexes =
    Array.isArray(color.hexes) && color.hexes.length
      ? color.hexes.slice(0, 2)
      : parseSwatchHexes(color.hex, color.label);
  return {
    ...color,
    hex: hexes[0] || color.hex || "#cccccc",
    hexes,
  };
}

/**
 * 將短名對齊到後台色票／屬性完整名稱（奶茶→淺奶茶、紅→酒紅）。
 * 有多個候選時取最長且唯一的包含關係匹配。
 */
export function alignColorLabel(
  label: string,
  candidates: Array<string | null | undefined> = [],
): string {
  const raw = String(label || "").trim();
  if (!raw) return "";

  const options = Array.from(
    new Set(
      candidates
        .map((c) => String(c || "").trim())
        .filter(Boolean),
    ),
  );
  if (!options.length) return raw;

  if (options.includes(raw)) return raw;

  const lower = raw.toLowerCase();
  const exactCi = options.find((o) => o.toLowerCase() === lower);
  if (exactCi) return exactCi;

  const contains = options.filter(
    (o) => o.includes(raw) || raw.includes(o),
  );
  if (contains.length === 1) return contains[0];
  if (contains.length > 1) {
    contains.sort((a, b) => b.length - a.length || a.localeCompare(b, "zh-Hant"));
    // 最短短名對到最長完整名（紅→酒紅、奶茶→淺奶茶）
    return contains[0];
  }

  return raw;
}

/** 同款多色獨立商品 → 色票清單（優先於變體顏色） */
export function buildColorsFromSiblings(
  siblings: ColorSibling[] | undefined | null,
  swatches: Record<string, string> = {},
): ProductColor[] {
  if (!Array.isArray(siblings) || siblings.length === 0) return [];

  const candidates = Object.keys(swatches || {});
  const seen = new Set<string>();
  const out: ProductColor[] = [];
  for (const row of siblings) {
    const rawLabel = String(row?.color || "").trim();
    const label = alignColorLabel(rawLabel, candidates) || rawLabel;
    const slug = String(row?.slug || "").trim();
    if (!label || !slug || seen.has(label)) continue;
    seen.add(label);
    const rawHex = String(row.hex || "").trim();
    const fromSwatch = resolveSwatchHex(label, swatches);
    // 對齊後若色票表有完整名，優先用後台色碼（避免短名猜成亮紅）
    const fromSibling =
      !fromSwatch && !isUnknownSwatchHex(rawHex.split(/[/／]/)[0] || "")
        ? rawHex
        : "";
    const stored = fromSwatch || fromSibling || formatSwatchHexes(guessColorHexes(label));
    out.push(
      withHexes({
        label,
        hex: stored,
        hexes: parseSwatchHexes(stored, label),
        slug,
        productId: Number(row.id) || undefined,
        image: String(row.image || "").trim() || undefined,
      }),
    );
  }
  return out;
}

/** 從 slug 猜顏色（classic-...-white / -wh / -iv → 白／奶茶） */
export function guessColorLabelFromSlug(slug: string): string {
  const s = String(slug || "").toLowerCase();
  const map: Array<[RegExp, string]> = [
    [/(?:^|[-_])(?:white|whit|wh)(?:$|[-_])/, "白"],
    [/(?:^|[-_])(?:black|bk)(?:$|[-_])/, "黑"],
    [/(?:^|[-_])(?:red|rd)(?:$|[-_])/, "紅"],
    [/(?:^|[-_])(?:pink|pk)(?:$|[-_])/, "粉"],
    [/(?:^|[-_])(?:navy|nv|深蓝)(?:$|[-_])/, "深藍"],
    [/(?:^|[-_])(?:blue)(?:$|[-_])/, "藍"],
    [/(?:^|[-_])(?:green|gr)(?:$|[-_])/, "綠"],
    [/(?:^|[-_])(?:brown|br)(?:$|[-_])/, "棕"],
    [/(?:^|[-_])(?:ivory|iv|beige|奶茶)(?:$|[-_])/, "奶茶"],
    [/(?:^|[-_])(?:gray|grey)(?:$|[-_])/, "灰"],
  ];
  for (const [re, label] of map) {
    if (re.test(s)) return label;
  }
  return "";
}

/**
 * 確保目前商品一定出現在色票裡（避免白色漏掉時當頁沒有自己的色票）
 */
export function ensureCurrentColorInList(
  colors: ProductColor[],
  current: {
    id?: number | string;
    slug?: string;
    color?: string;
    hex?: string;
    image?: string;
  },
): ProductColor[] {
  const slug = String(current.slug || "").trim();
  if (!slug) return colors;

  if (colors.some((c) => c.slug === slug)) return colors;

  const label =
    String(current.color || "").trim() ||
    guessColorLabelFromSlug(slug) ||
    "本色";
  const withoutDupLabel = colors.filter((c) => c.label !== label);
  const currentHex = String(current.hex || "").trim();
  const stored =
    (!isUnknownSwatchHex(currentHex.split(/[/／]/)[0] || "")
      ? currentHex
      : "") || formatSwatchHexes(guessColorHexes(label));
  return [
    withHexes({
      label,
      hex: stored,
      hexes: parseSwatchHexes(stored, label),
      slug,
      productId: current.id ? Number(current.id) : undefined,
      image: current.image,
    }),
    ...withoutDupLabel,
  ];
}

export const DEFAULT_PRODUCT_COLORS: ProductColor[] = [
  withHexes({ label: "紅", hex: "#b20000" }),
  withHexes({ label: "黑", hex: "#111111" }),
  withHexes({ label: "粉", hex: "#ffe0f4" }),
  withHexes({ label: "白", hex: "#ffffff" }),
];

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

/** 從色票表找色碼：精確 → trim → 不分大小寫（可為雙色字串） */
export function resolveSwatchHex(
  label: string,
  swatches: Record<string, string>,
): string | null {
  if (!label || !swatches || !Object.keys(swatches).length) return null;
  if (swatches[label]) return swatches[label];

  const trimmed = label.trim();
  if (swatches[trimmed]) return swatches[trimmed];

  const lower = trimmed.toLowerCase();
  for (const [key, hex] of Object.entries(swatches)) {
    if (key.trim() === trimmed || key.trim().toLowerCase() === lower) {
      return hex;
    }
  }
  return null;
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
  // 已帶好 hex 的 colors 仍要以 swatches 覆寫（避免舊快取／猜測色）
  const swatches = product.hover_color_swatches || {};

  if (Array.isArray(product.colors) && product.colors.length > 0) {
    return product.colors.map((c) => {
      const label = String(c.label || "").trim();
      const fromSwatch = resolveSwatchHex(label, swatches);
      const existing = String(c.hex || "").trim();
      const existingHexes = Array.isArray(c.hexes) ? c.hexes : [];
      const stored =
        fromSwatch ||
        (existingHexes.length
          ? formatSwatchHexes(existingHexes)
          : !isUnknownSwatchHex(existing.split(/[/／]/)[0] || "")
            ? existing
            : "") ||
        formatSwatchHexes(guessColorHexes(label));
      return withHexes({
        label,
        hex: stored,
        hexes: parseSwatchHexes(stored, label),
        slug: c.slug,
        productId: c.productId,
        image: c.image,
      });
    });
  }

  const colorAttr = findAttribute(product.attributes, isColorAttributeName);
  if (!colorAttr?.options?.length) {
    // 無顏色屬性時不灌預設四色（避免單色獨立商品誤顯示可切換色票）
    return [];
  }

  return colorAttr.options
    .map((label) => String(label || "").trim())
    .filter(Boolean)
    .map((label) => {
      const stored =
        resolveSwatchHex(label, swatches) ||
        formatSwatchHexes(guessColorHexes(label));
      return withHexes({
        label,
        hex: stored,
        hexes: parseSwatchHexes(stored, label),
      });
    });
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
  let data: unknown = raw;
  if (typeof data === "string" && data.trim()) {
    try {
      data = JSON.parse(data);
    } catch {
      return {};
    }
  }
  if (!data || typeof data !== "object") return {};
  const out: Record<string, string> = {};
  for (const [label, hex] of Object.entries(data as Record<string, unknown>)) {
    const key = String(label || "").trim();
    if (!key) continue;
    const value = String(hex || "").trim();
    const hexes = parseSwatchHexes(value, key).filter((h) => HEX_RE.test(h));
    if (!hexes.length) continue;
    out[key] = formatSwatchHexes(hexes);
  }
  return out;
}

export function extractColorSwatchesFromWooProduct(product: {
  hover_color_swatches?: unknown;
  meta_data?: Array<{ key?: string; value?: unknown }>;
}): Record<string, string> {
  if (product.hover_color_swatches) {
    const fromField = normalizeColorSwatches(product.hover_color_swatches);
    if (Object.keys(fromField).length) return fromField;
  }
  const meta = product.meta_data?.find((m) => m.key === "hover_color_swatches");
  if (meta?.value !== undefined && meta?.value !== null && meta?.value !== "") {
    return normalizeColorSwatches(meta.value);
  }
  return {};
}
