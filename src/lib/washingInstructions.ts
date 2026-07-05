export type WashingInstructions = {
  enabled: boolean;
  items: string[];
};

export const DEFAULT_WASHING_INSTRUCTIONS: WashingInstructions = {
  enabled: true,
  items: [
    "建議手洗或機洗冷水輕柔模式",
    "請勿使用漂白劑",
    "請勿烘乾",
    "可低溫熨燙（最高 110°C）",
    "洗滌前請將衣物翻面",
  ],
};

function parseBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "1" || value === 1 || value === "true") return true;
  if (value === "0" || value === 0 || value === "false") return false;
  return fallback;
}

export function isWashingInstructionsVisible(
  guide: WashingInstructions | null | undefined,
): boolean {
  if (!guide?.enabled) return false;
  return guide.items.some((item) => item.trim());
}

export function normalizeWashingInstructions(raw: unknown): WashingInstructions {
  const d = DEFAULT_WASHING_INSTRUCTIONS;
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

  const items = Array.isArray(parsed.items)
    ? (parsed.items as string[])
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : d.items;

  return {
    enabled: parseBool(parsed.enabled, d.enabled),
    items: items.length ? items : d.items,
  };
}

export function extractWashingInstructionsFromWooProduct(product: {
  hover_washing_instructions?: unknown;
  meta_data?: Array<{ key?: string; value?: unknown }>;
}): WashingInstructions {
  if (product.hover_washing_instructions) {
    return normalizeWashingInstructions(product.hover_washing_instructions);
  }

  const meta = product.meta_data?.find(
    (m) => m.key === "hover_washing_instructions",
  );
  if (meta?.value) {
    return normalizeWashingInstructions(meta.value);
  }

  return { ...DEFAULT_WASHING_INSTRUCTIONS, enabled: false };
}
