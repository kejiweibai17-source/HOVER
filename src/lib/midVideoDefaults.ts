export type MidVideoDeviceMedia = {
  videoUrl: string;
  posterUrl: string;
};

export type MidVideoSettings = {
  enabled: boolean;
  version: string;
  title: string;
  body: string;
  href: string;
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
  desktop: MidVideoDeviceMedia;
  mobile: MidVideoDeviceMedia;
  active?: boolean;
};

export const DEFAULT_MID_VIDEO: MidVideoSettings = {
  enabled: false,
  version: "1",
  title: "",
  body: "",
  href: "/products",
  autoplay: true,
  muted: true,
  loop: true,
  desktop: { videoUrl: "", posterUrl: "" },
  mobile: { videoUrl: "", posterUrl: "" },
  active: false,
};

function parseBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "1" || value === 1 || value === "true") return true;
  if (value === "0" || value === 0 || value === "false") return false;
  return fallback;
}

function normalizeDevice(raw: unknown, fallback: MidVideoDeviceMedia): MidVideoDeviceMedia {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    videoUrl: String(o.videoUrl || o.video_url || fallback.videoUrl || "").trim(),
    posterUrl: String(o.posterUrl || o.poster_url || fallback.posterUrl || "").trim(),
  };
}

export function isMidVideoActive(settings: MidVideoSettings): boolean {
  if (!settings.enabled) return false;
  return Boolean(
    settings.desktop.videoUrl ||
      settings.mobile.videoUrl ||
      settings.desktop.posterUrl ||
      settings.mobile.posterUrl,
  );
}

export function normalizeMidVideoSettings(raw: unknown): MidVideoSettings {
  const d = DEFAULT_MID_VIDEO;
  if (!raw || typeof raw !== "object") return d;

  const o = raw as Record<string, unknown>;
  const desktop = normalizeDevice(o.desktop, d.desktop);
  let mobile = normalizeDevice(o.mobile, d.mobile);

  if (!mobile.videoUrl && desktop.videoUrl) mobile = { ...mobile, videoUrl: desktop.videoUrl };
  if (!mobile.posterUrl && desktop.posterUrl) {
    mobile = { ...mobile, posterUrl: desktop.posterUrl };
  }

  const settings: MidVideoSettings = {
    enabled: parseBool(o.enabled, d.enabled),
    version: String(o.version || d.version).trim() || d.version,
    title: String(o.title || "").trim(),
    body: String(o.body || "").trim(),
    href: String(o.href || d.href).trim() || d.href,
    autoplay: parseBool(o.autoplay, d.autoplay),
    muted: parseBool(o.muted, d.muted),
    loop: parseBool(o.loop, d.loop),
    desktop,
    mobile,
  };

  settings.active = isMidVideoActive(settings);
  return settings;
}

function getWordPressBase(): string {
  return (process.env.WC_API_BASE || process.env.WORDPRESS_API_URL || "").replace(
    /\/$/,
    "",
  );
}

export async function fetchMidVideoSettings(): Promise<MidVideoSettings> {
  const base = getWordPressBase();
  if (!base) return DEFAULT_MID_VIDEO;

  try {
    const res = await fetch(`${base}/wp-json/hover/v1/mid-video`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) throw new Error(`Mid video API ${res.status}`);
    const data = await res.json();
    return normalizeMidVideoSettings(data?.midVideo ?? data);
  } catch {
    return DEFAULT_MID_VIDEO;
  }
}
