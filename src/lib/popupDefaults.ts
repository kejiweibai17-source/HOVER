import type { CSSProperties } from "react";

export type PopupImage = {
  url: string;
  alt: string;
};

export type PopupButtonWidth = "S" | "M" | "L";
export type PopupButtonVariant = "brand" | "white";

export type PopupButton = {
  label: string;
  href: string;
  show: boolean;
  width: PopupButtonWidth;
  fontSize: number;
  fontWeight: number;
  variant: PopupButtonVariant;
};

export type PopupTypeBlock = {
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
};

export type PopupTypography = {
  title: PopupTypeBlock;
  subtitle: PopupTypeBlock;
  body: PopupTypeBlock;
  footnote: PopupTypeBlock;
};

export type PopupLinkItem = {
  label: string;
  href: string;
};

export type PopupLinks = {
  terms: PopupLinkItem;
  privacy: PopupLinkItem;
};

export type PopupSchedule = {
  startAt: string;
  endAt: string;
};

export type PopupTrigger = {
  /** 0 = off；進站後延遲秒數 */
  delaySec: number;
  /** 0 = off；頁面捲動達百分比時觸發；與 delay 同時設定以先達成者為準 */
  scrollPercent: number;
};

export type PopupLayout = "split" | "full";
export type PopupImagePosition = "left" | "right";
export type PopupFrequency = "always" | "daily" | "weekly" | "once";
export type PopupGiftScale = 100 | 110 | 120;

export type PopupColors = {
  title: string;
  subtitle: string;
  body: string;
  footnote: string;
};

export type PopupSettings = {
  enabled: boolean;
  version: string;
  layout: PopupLayout;
  imagePosition: PopupImagePosition;
  hideForMembers: boolean;
  title: string;
  subtitle: string;
  body: string;
  footnote: string;
  showGiftIcon: boolean;
  giftIconScale: PopupGiftScale;
  colors: PopupColors;
  typography: PopupTypography;
  links: PopupLinks;
  imageDesktop: PopupImage;
  imageMobile: PopupImage;
  /** @deprecated 相容舊 API，等同 imageDesktop */
  image: PopupImage;
  button: PopupButton;
  trigger: PopupTrigger;
  frequency: PopupFrequency;
  schedule: PopupSchedule;
  active?: boolean;
};

const DEFAULT_TYPE: PopupTypography = {
  title: { fontSize: 28, fontWeight: 500, lineHeight: 1.35 },
  subtitle: { fontSize: 14, fontWeight: 400, lineHeight: 1.4 },
  body: { fontSize: 13, fontWeight: 400, lineHeight: 1.75 },
  footnote: { fontSize: 11, fontWeight: 400, lineHeight: 1.5 },
};

export const DEFAULT_POPUP: PopupSettings = {
  enabled: false,
  version: "1",
  layout: "split",
  imagePosition: "left",
  hideForMembers: true,
  title: "",
  subtitle: "",
  body: "",
  footnote: "",
  showGiftIcon: false,
  giftIconScale: 110,
  colors: {
    title: "#222222",
    subtitle: "#555555",
    body: "#444444",
    footnote: "#999999",
  },
  typography: DEFAULT_TYPE,
  links: {
    terms: { label: "會員條款", href: "/terms" },
    privacy: { label: "隱私權政策", href: "/privacy" },
  },
  imageDesktop: { url: "", alt: "" },
  imageMobile: { url: "", alt: "" },
  image: { url: "", alt: "" },
  button: {
    label: "立即加入",
    href: "/register",
    show: true,
    width: "M",
    fontSize: 13,
    fontWeight: 600,
    variant: "brand",
  },
  trigger: { delaySec: 0, scrollPercent: 0 },
  frequency: "weekly",
  schedule: { startAt: "", endAt: "" },
  active: false,
};

function parseBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "1" || value === 1 || value === "true") return true;
  if (value === "0" || value === 0 || value === "false") return false;
  return fallback;
}

function parseIntSafe(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function normalizeImage(raw: unknown, fallback: PopupImage): PopupImage {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    url: String(o.url || fallback.url || "").trim(),
    alt: String(o.alt || fallback.alt || "").trim(),
  };
}

function sanitizeHex(value: unknown, fallback: string): string {
  const s = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(s) ? s : fallback;
}

function normalizeColors(raw: unknown, fallback: PopupColors): PopupColors {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    title: sanitizeHex(o.title, fallback.title),
    subtitle: sanitizeHex(o.subtitle, fallback.subtitle),
    body: sanitizeHex(o.body, fallback.body),
    footnote: sanitizeHex(o.footnote, fallback.footnote),
  };
}

function normalizeTypeBlock(raw: unknown, fallback: PopupTypeBlock): PopupTypeBlock {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const weight = parseIntSafe(o.fontWeight, fallback.fontWeight);
  return {
    fontSize: clamp(parseIntSafe(o.fontSize, fallback.fontSize), 8, 48),
    fontWeight: ([400, 500, 600, 700] as const).includes(weight as 400)
      ? weight
      : fallback.fontWeight,
    lineHeight: clamp(
      Number.isFinite(Number(o.lineHeight))
        ? Number(o.lineHeight)
        : fallback.lineHeight,
      1,
      2.4,
    ),
  };
}

function normalizeTypography(
  raw: unknown,
  fallback: PopupTypography,
): PopupTypography {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    title: normalizeTypeBlock(o.title, fallback.title),
    subtitle: normalizeTypeBlock(o.subtitle, fallback.subtitle),
    body: normalizeTypeBlock(o.body, fallback.body),
    footnote: normalizeTypeBlock(o.footnote, fallback.footnote),
  };
}

function normalizeLinkItem(raw: unknown, fallback: PopupLinkItem): PopupLinkItem {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    label: String(o.label || fallback.label).trim() || fallback.label,
    href: String(o.href || fallback.href).trim() || fallback.href,
  };
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
    popup.imageDesktop.url.trim() ||
      popup.imageMobile.url.trim() ||
      popup.image.url.trim() ||
      popup.title.trim() ||
      popup.body.trim(),
  );
}

export function isPopupVisible(popup: PopupSettings, now = new Date()): boolean {
  return (
    popup.enabled &&
    hasPopupContent(popup) &&
    isPopupInSchedule(popup.schedule, now)
  );
}

export function typeStyle(
  block: PopupTypeBlock,
  opts?: { mobile?: boolean },
): CSSProperties {
  const scale = opts?.mobile ? 0.86 : 1;
  return {
    fontSize: `${Math.round(block.fontSize * scale)}px`,
    fontWeight: block.fontWeight,
    lineHeight: block.lineHeight,
  };
}

export function buttonWidthPx(width: PopupButtonWidth): number {
  if (width === "S") return 120;
  if (width === "L") return 200;
  return 148;
}

export function normalizePopupSettings(raw: unknown): PopupSettings {
  const d = DEFAULT_POPUP;
  if (!raw || typeof raw !== "object") return d;

  const o = raw as Record<string, unknown>;
  const buttonRaw = (o.button as Record<string, unknown>) || {};
  const scheduleRaw = (o.schedule as Record<string, unknown>) || {};
  const triggerRaw = (o.trigger as Record<string, unknown>) || {};
  const linksRaw = (o.links as Record<string, unknown>) || {};
  const legacyImage = normalizeImage(o.image, d.image);
  let imageDesktop = normalizeImage(o.imageDesktop ?? o.image_desktop, d.imageDesktop);
  let imageMobile = normalizeImage(o.imageMobile ?? o.image_mobile, d.imageMobile);

  if (!imageDesktop.url && legacyImage.url) imageDesktop = legacyImage;
  if (!imageMobile.url && imageDesktop.url) {
    imageMobile = { ...imageDesktop, alt: imageMobile.alt || imageDesktop.alt };
  }

  const layoutRaw = String(o.layout || d.layout);
  const layout: PopupLayout = layoutRaw === "full" ? "full" : "split";
  const posRaw = String(o.imagePosition || o.image_position || d.imagePosition);
  const imagePosition: PopupImagePosition = posRaw === "right" ? "right" : "left";

  const freqRaw = String(o.frequency || d.frequency);
  const frequency: PopupFrequency = (
    ["always", "daily", "weekly", "once"] as const
  ).includes(freqRaw as PopupFrequency)
    ? (freqRaw as PopupFrequency)
    : "weekly";

  const scroll = Math.min(100, parseIntSafe(triggerRaw.scrollPercent ?? triggerRaw.scroll, 0));

  const scaleRaw = parseIntSafe(o.giftIconScale ?? o.gift_icon_scale, d.giftIconScale);
  const giftIconScale: PopupGiftScale = ([100, 110, 120] as const).includes(
    scaleRaw as PopupGiftScale,
  )
    ? (scaleRaw as PopupGiftScale)
    : 110;

  const widthRaw = String(buttonRaw.width || d.button.width).toUpperCase();
  const width: PopupButtonWidth = (["S", "M", "L"] as const).includes(
    widthRaw as PopupButtonWidth,
  )
    ? (widthRaw as PopupButtonWidth)
    : "M";

  const variantRaw = String(buttonRaw.variant || d.button.variant);
  const variant: PopupButtonVariant =
    variantRaw === "white" ? "white" : "brand";

  const btnWeight = parseIntSafe(buttonRaw.fontWeight, d.button.fontWeight);

  const popup: PopupSettings = {
    enabled: parseBool(o.enabled, d.enabled),
    version: String(o.version || d.version).trim() || d.version,
    layout,
    imagePosition,
    hideForMembers: parseBool(
      o.hideForMembers ?? o.hide_for_members,
      layout === "split",
    ),
    title: String(o.title || "").trim(),
    subtitle: String(o.subtitle || "").trim(),
    body: String(o.body || "").trim(),
    footnote: String(o.footnote || "").trim(),
    showGiftIcon: parseBool(o.showGiftIcon ?? o.show_gift_icon, layout === "split"),
    giftIconScale,
    colors: normalizeColors(o.colors, d.colors),
    typography: normalizeTypography(o.typography, d.typography),
    links: {
      terms: normalizeLinkItem(linksRaw.terms, d.links.terms),
      privacy: normalizeLinkItem(linksRaw.privacy, d.links.privacy),
    },
    imageDesktop,
    imageMobile,
    image: imageDesktop,
    button: {
      label: String(buttonRaw.label || d.button.label).trim() || d.button.label,
      href: String(buttonRaw.href || d.button.href).trim() || d.button.href,
      show: parseBool(buttonRaw.show ?? buttonRaw.enabled, d.button.show),
      width,
      fontSize: clamp(
        parseIntSafe(buttonRaw.fontSize, d.button.fontSize),
        10,
        20,
      ),
      fontWeight: ([400, 500, 600, 700] as const).includes(btnWeight as 400)
        ? btnWeight
        : d.button.fontWeight,
      variant,
    },
    trigger: {
      delaySec: parseIntSafe(triggerRaw.delaySec ?? triggerRaw.delay, 0),
      scrollPercent: scroll,
    },
    frequency,
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

export function getPopupStorageKey(version: string): string {
  return `hover_home_popup_v${version || "1"}`;
}

/** @deprecated use getPopupStorageKey */
export function getPopupDismissKey(version: string): string {
  return getPopupStorageKey(version);
}

export function isPopupDismissed(
  version: string,
  frequency: PopupFrequency,
): boolean {
  if (typeof window === "undefined") return false;
  const key = getPopupStorageKey(version);

  try {
    if (frequency === "always") {
      return sessionStorage.getItem(key) === "1";
    }

    const raw = localStorage.getItem(key);
    if (!raw) return false;

    if (frequency === "once") return true;

    const at = Number(raw);
    if (!Number.isFinite(at)) return true;

    const elapsed = Date.now() - at;
    if (frequency === "daily") return elapsed < 24 * 60 * 60 * 1000;
    if (frequency === "weekly") return elapsed < 7 * 24 * 60 * 60 * 1000;
    return false;
  } catch {
    return false;
  }
}

export function markPopupDismissed(
  version: string,
  frequency: PopupFrequency,
): void {
  if (typeof window === "undefined") return;
  const key = getPopupStorageKey(version);
  try {
    if (frequency === "always") {
      sessionStorage.setItem(key, "1");
      return;
    }
    localStorage.setItem(key, String(Date.now()));
  } catch {
    // ignore
  }
}
