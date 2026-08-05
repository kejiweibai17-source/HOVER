export type SizeGuideRow = {
  label: string;
  values: string[];
};

export type SizeGuideModel = {
  /** 顯示名稱，如「女模 Mina」 */
  label: string;
  /** 身高，如「168 cm」 */
  height: string;
  /** 體重，如「50 kg」 */
  weight: string;
  /** 穿著尺寸，如「M」 */
  size: string;
};

export type SizeGuide = {
  enabled: boolean;
  unitLabel: string;
  sizes: string[];
  rows: SizeGuideRow[];
  note: string;
  imageUrl: string;
  /** Model 實穿參考 */
  models: SizeGuideModel[];
  /** Model 區塊備註 */
  modelNote: string;
};

export const DEFAULT_MODEL_NOTE =
  "※ 因個人體型、身形比例及穿著習慣不同，實際穿著效果可能有所差異，以上資訊僅供尺寸選購參考。";

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
  models: [
    { label: "女模 Mina", height: "168 cm", weight: "50 kg", size: "M" },
    { label: "男模 Wilson", height: "185 cm", weight: "90 kg", size: "XL" },
  ],
  modelNote: DEFAULT_MODEL_NOTE,
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

function normalizeModels(raw: unknown): SizeGuideModel[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const label = String(o.label || "").trim();
      const height = String(o.height || "").trim();
      const weight = String(o.weight || "").trim();
      const size = String(o.size || "").trim();
      if (!label && !height && !weight && !size) return null;
      return { label, height, weight, size };
    })
    .filter((m): m is SizeGuideModel => !!m);
}

export function isSizeGuideVisible(guide: SizeGuide | null | undefined): boolean {
  if (!guide?.enabled) return false;
  if (!guide.sizes.length || !guide.rows.length) return false;
  return guide.rows.some((row) => row.label.trim());
}

export function hasModelReferences(guide: SizeGuide | null | undefined): boolean {
  return !!guide?.models?.some(
    (m) => m.label.trim() || m.height.trim() || m.weight.trim() || m.size.trim(),
  );
}

/** 前台顯示：女模 Mina｜168 cm／50 kg｜M */
export function formatModelLine(model: SizeGuideModel): string {
  const parts = [
    model.label.trim(),
    [model.height, model.weight].filter(Boolean).join("／"),
    model.size.trim(),
  ].filter(Boolean);
  return parts.join("｜");
}

export function normalizeSizeGuide(raw: unknown): SizeGuide {
  const d = DEFAULT_SIZE_GUIDE;
  if (!raw) return { ...d, enabled: false, models: [], modelNote: d.modelNote };

  let parsed: Record<string, unknown> | null = null;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return { ...d, enabled: false, models: [], modelNote: d.modelNote };
    }
  } else if (typeof raw === "object") {
    parsed = raw as Record<string, unknown>;
  }

  if (!parsed) return { ...d, enabled: false, models: [], modelNote: d.modelNote };

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

  const models = normalizeModels(parsed.models);
  const modelNoteRaw = parsed.modelNote ?? parsed.model_note;
  const modelNote =
    modelNoteRaw === undefined || modelNoteRaw === null
      ? d.modelNote
      : String(modelNoteRaw).trim();

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
    models,
    modelNote,
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

  return { ...DEFAULT_SIZE_GUIDE, enabled: false, models: [] };
}
