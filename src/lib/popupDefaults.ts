export type PopupImage = {
  url: string;
  alt: string;
};

export type PopupButton = {
  label: string;
  href: string;
  show: boolean;
};

export type PopupSchedule = {
  startAt: string;
  endAt: string;
};

export type PopupSettings = {
  enabled: boolean;
  version: string;
  title: string;
  body: string;
  image: PopupImage;
  button: PopupButton;
  schedule: PopupSchedule;
  active?: boolean;
};

export const DEFAULT_POPUP: PopupSettings = {
  enabled: false,
  version: "1",
  title: "",
  body: "",
  image: { url: "", alt: "" },
  button: { label: "前往查看", href: "/", show: true },
  schedule: { startAt: "", endAt: "" },
  active: false,
};

function parseBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "1" || value === 1 || value === "true") return true;
  if (value === "0" || value === 0 || value === "false") return false;
  return fallback;
}

export function isPopupInSchedule(
  schedule: PopupSchedule,
  now = new Date(),
): boolean {
  const start = schedule.startAt ? new Date(schedule.startAt) : null;
  const end = schedule.endAt ? new Date(schedule.endAt) : null;

  if (start && !Number.isNaN(start.getTime()) && now < start) return false;
  if (end && !Number.isNaN(end.getTime()) && now > end) return false;
  return true;
}

export function hasPopupContent(popup: PopupSettings): boolean {
  return Boolean(
    popup.image.url.trim() || popup.title.trim() || popup.body.trim(),
  );
}

export function isPopupVisible(popup: PopupSettings, now = new Date()): boolean {
  return (
    popup.enabled &&
    hasPopupContent(popup) &&
    isPopupInSchedule(popup.schedule, now)
  );
}

export function normalizePopupSettings(raw: unknown): PopupSettings {
  const d = DEFAULT_POPUP;
  if (!raw || typeof raw !== "object") return d;

  const o = raw as Record<string, unknown>;
  const imageRaw = (o.image as Record<string, unknown>) || {};
  const buttonRaw = (o.button as Record<string, unknown>) || {};
  const scheduleRaw = (o.schedule as Record<string, unknown>) || {};

  const popup: PopupSettings = {
    enabled: parseBool(o.enabled, d.enabled),
    version: String(o.version || d.version).trim() || d.version,
    title: String(o.title || "").trim(),
    body: String(o.body || "").trim(),
    image: {
      url: String(imageRaw.url || "").trim(),
      alt: String(imageRaw.alt || d.image.alt).trim(),
    },
    button: {
      label: String(buttonRaw.label || d.button.label).trim() || d.button.label,
      href: String(buttonRaw.href || d.button.href).trim() || d.button.href,
      show: parseBool(buttonRaw.show ?? buttonRaw.enabled, d.button.show),
    },
    schedule: {
      startAt: String(scheduleRaw.startAt || scheduleRaw.start_at || "").trim(),
      endAt: String(scheduleRaw.endAt || scheduleRaw.end_at || "").trim(),
    },
    active: parseBool(o.active, false),
  };

  if (typeof o.active !== "boolean") {
    popup.active = isPopupVisible(popup);
  }

  return popup;
}

export function getPopupDismissKey(version: string): string {
  /** sessionStorage key — dismissed until tab/browser session ends */
  return `hover_home_popup_v${version || "1"}`;
}
