export type AnnouncementItem = {
  id: string;
  text: string;
  href: string;
  enabled: boolean;
};

export type AnnouncementSettings = {
  enabled: boolean;
  autoplayMs: number;
  backgroundColor: string;
  textColor: string;
  items: AnnouncementItem[];
};

export const DEFAULT_ANNOUNCEMENT: AnnouncementSettings = {
  enabled: true,
  autoplayMs: 4000,
  backgroundColor: "#2a514d",
  textColor: "#f0f0f0",
  items: [
    {
      id: "ann-1",
      text: "全館滿NT$2,000享免運!",
      href: "/how-to-buy",
      enabled: true,
    },
    {
      id: "ann-2",
      text: "新會員註冊即享 NT$100 購物金",
      href: "/membership",
      enabled: true,
    },
  ],
};

function parseBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "1" || value === 1 || value === "true") return true;
  if (value === "0" || value === 0 || value === "false") return false;
  return fallback;
}

export function getActiveAnnouncementItems(
  settings: AnnouncementSettings | null | undefined,
): AnnouncementItem[] {
  if (!settings?.enabled) return [];
  return (settings.items || []).filter(
    (item) => item.enabled && item.text.trim(),
  );
}

export function normalizeAnnouncementSettings(
  raw: unknown,
): AnnouncementSettings {
  const d = DEFAULT_ANNOUNCEMENT;
  if (!raw || typeof raw !== "object") return d;

  const o = raw as Record<string, unknown>;
  const autoplayMs = Math.max(
    2000,
    Math.min(
      15000,
      Number(o.autoplayMs ?? o.autoplay_ms ?? d.autoplayMs) || d.autoplayMs,
    ),
  );

  const items = Array.isArray(o.items)
    ? (o.items as AnnouncementItem[])
        .map((item, index) => ({
          id: String(item?.id || `ann-${index + 1}`).trim() || `ann-${index + 1}`,
          text: String(item?.text || "").trim(),
          href: String(item?.href || "").trim(),
          enabled: parseBool(item?.enabled, true),
        }))
        .filter((item) => item.text)
    : d.items;

  return {
    enabled: parseBool(o.enabled, d.enabled),
    autoplayMs,
    backgroundColor: String(
      o.backgroundColor || o.background_color || d.backgroundColor,
    ).trim(),
    textColor: String(o.textColor || o.text_color || d.textColor).trim(),
    items: items.length ? items : d.items,
  };
}

function getWordPressBase(): string {
  return (process.env.WC_API_BASE || process.env.WORDPRESS_API_URL || "").replace(
    /\/$/,
    "",
  );
}

export async function fetchAnnouncementSettings(): Promise<AnnouncementSettings> {
  const base = getWordPressBase();
  if (!base) return DEFAULT_ANNOUNCEMENT;

  try {
    const res = await fetch(`${base}/wp-json/hover/v1/announcement`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`Announcement API ${res.status}`);
    const data = await res.json();
    return normalizeAnnouncementSettings(data?.announcement ?? data);
  } catch {
    return DEFAULT_ANNOUNCEMENT;
  }
}
