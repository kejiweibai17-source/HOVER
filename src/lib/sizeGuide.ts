export type SizeGuideRow = {
  label: string;
  values: string[];
};

export type SizeGuide = {
  enabled: boolean;
  unitLabel: string;
  sizes: string[];
  rows: SizeGuideRow[];
  note: string;
  imageUrl: string;
};

export const DEFAULT_SIZE_GUIDE: SizeGuide = {
  enabled: true,
  unitLabel: "尺寸(公分)",
  sizes: ["S", "M", "L", "XL"],
  rows: [
    { label: "肩寬", values: ["41", "45.5", "48.5", "54"] },
    { label: "胸寬", values: ["48.5", "52", "55", "58.5"] },
    { label: "衣長", values: ["65", "69.5", "72", "76.5"] },
    { label: "袖長", values: ["18.5", "20", "21.5", "24"] },
  ],
  note: "※為平放測量，±2cm誤差範圍屬於製作標準範圍內。",
  imageUrl: "/images/量測.png",
};

function parseBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "1" || value === 1 || value === "true") return true;
  if (value === "0" || value === 0 || value === "false") return false;
  return fallback;
}

function padValues(values: string[], sizeCount: number): string[] {
  const next = [...values];
  while (next.length < sizeCount) next.push("");
  return next.slice(0, sizeCount);
}

export function isSizeGuideVisible(guide: SizeGuide | null | undefined): boolean {
  if (!guide?.enabled) return false;
  if (!guide.sizes.length || !guide.rows.length) return false;
  return guide.rows.some((row) => row.label.trim());
}

export function normalizeSizeGuide(raw: unknown): SizeGuide {
  const d = DEFAULT_SIZE_GUIDE;
  if (!raw) return { ...d, enabled: false };

  let parsed: Record<string, unknown> | null = null;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return { ...d, enabled: false };
    }
  } else if (typeof raw === "object") {
    parsed = raw as Record<string, unknown>;
  }

  if (!parsed) return { ...d, enabled: false };

  const sizes = Array.isArray(parsed.sizes)
    ? (parsed.sizes as string[])
        .map((s) => String(s || "").trim())
        .filter(Boolean)
    : [];

  const finalSizes = sizes;

  const rows = Array.isArray(parsed.rows)
    ? (parsed.rows as SizeGuideRow[])
        .map((row) => ({
          label: String(row?.label || "").trim(),
          values: padValues(
            Array.isArray(row?.values)
              ? row.values.map((v) => String(v ?? "").trim())
              : [],
            Math.max(finalSizes.length, 1),
          ),
        }))
        .filter((row) => row.label)
    : [];

  // 有 sizes 時對齊欄數；沒有 sizes 就保留列上的 values
  const alignedRows =
    finalSizes.length > 0
      ? rows.map((row) => ({
          ...row,
          values: padValues(row.values, finalSizes.length),
        }))
      : rows;

  return {
    enabled: parseBool(parsed.enabled, false),
    unitLabel:
      String(parsed.unitLabel || parsed.unit_label || d.unitLabel).trim() ||
      d.unitLabel,
    sizes: finalSizes,
    rows: alignedRows,
    note: String(parsed.note ?? d.note).trim(),
    imageUrl: String(
      parsed.imageUrl || parsed.image_url || d.imageUrl,
    ).trim() || d.imageUrl,
  };
}

export function extractSizeGuideFromWooProduct(product: {
  hover_size_guide?: unknown;
  meta_data?: Array<{ key?: string; value?: unknown }>;
}): SizeGuide {
  if (product.hover_size_guide) {
    return normalizeSizeGuide(product.hover_size_guide);
  }

  const meta = product.meta_data?.find((m) => m.key === "hover_size_guide");
  if (meta?.value) {
    return normalizeSizeGuide(meta.value);
  }

  return { ...DEFAULT_SIZE_GUIDE, enabled: false };
}
