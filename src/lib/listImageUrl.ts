/**
 * 不依賴 Vercel Image Optimization：優先走 Jetpack Photon（WebP／縮圖），
 * 失敗再回退 WordPress 本機已生成的尺寸檔。
 *
 * 商品圖統一 3:4。避開舊的 4:5（600×750）與 1:1（300×300）裁切檔僅作來源參考。
 */

export type ImageRole = "card" | "pdp" | "banner" | "bannerMobile" | "thumb";

/**
 * Photon 輸出寬度：對齊常見 Retina 顯示，但仍由 CDN 出 WebP（不走 Vercel Image）。
 * 勿再喂 600px 小檔給全螢幕／半寬大圖，否則會被放大變糊。
 */
const ROLE_MAX: Record<ImageRole, number> = {
  /** 購物車側欄／結帳縮圖（約 90px ×2） */
  thumb: 240,
  /** 列表約 22–50vw @2x → 800 足夠清晰，仍遠小於原圖 */
  card: 800,
  /** PDP 主圖約 50vw @2x */
  pdp: 1600,
  /** 桌機 Hero／分類橫幅 100vw @2x（Retina 更清晰） */
  banner: 2560,
  /** 手機 Hero（另圖或同圖縮小） */
  bannerMobile: 1280,
};

const ROLE_QUALITY: Record<ImageRole, number> = {
  thumb: 70,
  card: 78,
  pdp: 82,
  banner: 90,
  bannerMobile: 88,
};

/**
 * 依角色嘗試的 WP 尺寸後綴（僅 Photon／原圖皆失敗時的本機 fallback）。
 * PDP／Banner 優先較大尺寸，避免先吃到 600 寬再被放大。
 */
const ROLE_SUFFIXES: Record<ImageRole, string[]> = {
  thumb: ["-600x800", "-600x750", "-300x300", "-150x150"],
  card: ["-800x1067", "-600x800", "-900x1200", "-600x750", "-768x1024"],
  pdp: [
    "-900x1200",
    "-800x1067",
    "-768x1024",
    "-600x800",
    "-1024x1024",
    "-600x750",
  ],
  banner: [
    "-2048x1152",
    "-1920x1080",
    "-1536x864",
    "-1024x576",
    "-768x432",
  ],
  bannerMobile: [
    "-1080x1920",
    "-768x1024",
    "-1024x576",
    "-768x432",
  ],
};

function photonDisabled(): boolean {
  return (
    typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_DISABLE_PHOTON === "1"
  );
}

function isPhotonHost(hostname: string): boolean {
  return /(^|\.)wp\.com$/i.test(hostname);
}

/** 寬高比是否接近目標（容許誤差） */
function isNearRatio(
  w: number,
  h: number,
  rw: number,
  rh: number,
  tol = 0.03,
): boolean {
  if (w <= 0 || h <= 0) return false;
  return Math.abs(w / h - rw / rh) <= tol;
}

/** 去掉 uploads URL 的 -WxH 尺寸後綴，回到原圖 */
export function toFullUploadUrl(src: string): string {
  if (!src || typeof src !== "string") return src;
  try {
    const u = new URL(src);
    if (!u.pathname.includes("/wp-content/uploads/")) return src;
    u.pathname = u.pathname.replace(/-\d+x\d+(\.[a-zA-Z]+)$/i, "$1");
    return u.toString();
  } catch {
    return src;
  }
}

/**
 * Photon → 原始 WP uploads URL（去掉 ?w=&quality=）
 */
export function stripPhotonUrl(src: string): string {
  if (!src || typeof src !== "string") return src;
  try {
    const u = new URL(src);
    if (!isPhotonHost(u.hostname)) return src;
    const raw = u.pathname.replace(/^\//, "");
    const slash = raw.indexOf("/");
    if (slash <= 0) return src;
    const host = raw.slice(0, slash);
    const path = raw.slice(slash);
    if (!path.includes("/wp-content/uploads/")) return src;
    const ssl = u.searchParams.get("ssl") !== "0";
    return `${ssl ? "https" : "http"}://${host}${path}`;
  } catch {
    return src;
  }
}

/**
 * 商品圖：方圖／過小縮圖（如 300×300）還原原圖，再選較大尺寸。
 */
export function unwrapNonProductRatioUrl(
  src: string,
  role: ImageRole = "card",
): string {
  if (!src || typeof src !== "string") return src;
  try {
    const u = new URL(src);
    if (!u.pathname.includes("/wp-content/uploads/")) return src;
    const m = u.pathname.match(/-(\d+)x(\d+)(\.[a-zA-Z]+)$/i);
    if (!m) return src;
    const w = Number(m[1]);
    const h = Number(m[2]);
    if (role === "card" || role === "thumb") {
      if (isNearRatio(w, h, 1, 1) || Math.max(w, h) < 480) {
        return toFullUploadUrl(src);
      }
      return src;
    }
    if (isNearRatio(w, h, 3, 4) || isNearRatio(w, h, 4, 5)) return src;
    if (isNearRatio(w, h, 1, 1)) return toFullUploadUrl(src);
    return src;
  } catch {
    return src;
  }
}

function withSuffix(pathname: string, suffix: string): string {
  const stripped = pathname.replace(/-\d+x\d+(\.[a-zA-Z]+)$/i, "$1");
  return stripped.replace(/(\.[a-zA-Z]+)$/, `${suffix}$1`);
}

/**
 * 從 WP REST 附加的 sizes 物件挑最適尺寸（優先）。
 */
export function pickWpSizeUrl(
  sizes:
    | Partial<
        Record<
          | "thumbnail"
          | "medium"
          | "medium_large"
          | "large"
          | "woocommerce_thumbnail"
          | "woocommerce_single"
          | "full",
          string | null | undefined
        >
      >
    | null
    | undefined,
  role: ImageRole,
  fallbackSrc?: string,
): string {
  if (!sizes) return fallbackSrc || "";

  const order: Array<keyof NonNullable<typeof sizes>> =
    role === "thumb"
      ? ["woocommerce_thumbnail", "medium", "thumbnail", "full"]
      : role === "card"
        ? [
            "woocommerce_single",
            "medium_large",
            "large",
            "full",
            "medium",
            "woocommerce_thumbnail",
            "thumbnail",
          ]
        : role === "pdp"
          ? [
              "full",
              "large",
              "woocommerce_single",
              "medium_large",
              "medium",
              "woocommerce_thumbnail",
            ]
          : ["full", "large", "medium_large", "medium"];

  for (const key of order) {
    const url = sizes[key];
    if (!url || !String(url).trim()) continue;
    const cleaned = unwrapNonProductRatioUrl(String(url).trim(), role);
    if (cleaned) return cleaned;
  }
  return fallbackSrc ? unwrapNonProductRatioUrl(fallbackSrc, role) : "";
}

/** 挑選本站 WP 實體檔 URL（尚未走 Photon） */
export function toDirectWpImageUrl(
  src: string,
  role: ImageRole = "card",
): string {
  if (!src || typeof src !== "string") return src;

  try {
    const isBanner = role === "banner" || role === "bannerMobile";
    const baseSrc = isBanner ? src : unwrapNonProductRatioUrl(src, role);
    const u = new URL(baseSrc);

    if (isPhotonHost(u.hostname)) {
      return toFullUploadUrl(stripPhotonUrl(baseSrc) || baseSrc);
    }

    if (!u.pathname.includes("/wp-content/uploads/")) {
      return baseSrc;
    }

    // 一律以「原圖」當 Photon 來源，再由 ?w= 縮到角色寬度。
    // 若喂 -600x750 小檔，Photon 無法憑空變清晰。
    return toFullUploadUrl(baseSrc);
  } catch {
    return src;
  }
}

/**
 * 經 Jetpack Photon 輸出 WebP／縮圖（CDN）。
 * 來源用原圖、輸出依 ROLE_MAX，避免小檔被放大變糊。
 */
export function viaPhoton(src: string, role: ImageRole = "card"): string {
  if (!src || photonDisabled()) return src;
  try {
    const u = new URL(src);
    const maxEdge = ROLE_MAX[role];
    const quality = ROLE_QUALITY[role];

    if (isPhotonHost(u.hostname)) {
      u.searchParams.set("w", String(maxEdge));
      u.searchParams.set("quality", String(quality));
      return u.toString();
    }

    if (!u.pathname.includes("/wp-content/uploads/")) return src;

    const photon = new URL(`https://i0.wp.com/${u.host}${u.pathname}`);
    photon.searchParams.set("w", String(maxEdge));
    photon.searchParams.set("quality", String(quality));
    if (u.protocol === "https:") photon.searchParams.set("ssl", "1");
    return photon.toString();
  } catch {
    return src;
  }
}

/**
 * 列表／內頁／橫幅統一入口：先挑 WP 尺寸檔，再包 Photon。
 */
export function toOptimizedImageUrl(
  src: string,
  role: ImageRole = "card",
): string {
  if (!src || typeof src !== "string") return src;
  const direct = toDirectWpImageUrl(src, role);
  return viaPhoton(direct, role);
}

/** 購物車／結帳小圖（顯示時呼叫即可，舊 localStorage 原圖也會被轉小） */
export function toCartThumbUrl(src: string): string {
  if (!src || typeof src !== "string") return src;
  if (src.startsWith("/")) return src;
  return toOptimizedImageUrl(src, "thumb");
}

/** @deprecated 使用 toOptimizedImageUrl(src, 'card') */
export function toListImageUrl(src: string, maxEdge = 300): string {
  const role: ImageRole =
    maxEdge <= 150
      ? "thumb"
      : maxEdge <= 400
        ? "card"
        : maxEdge <= 900
          ? "pdp"
          : maxEdge <= 1200
            ? "bannerMobile"
            : "banner";
  return toOptimizedImageUrl(src, role);
}

export function getFallbackSuffixes(role: ImageRole): string[] {
  return ROLE_SUFFIXES[role].slice(1);
}

export function applyWpSuffix(src: string, suffix: string): string {
  try {
    const bare = stripPhotonUrl(src);
    const u = new URL(bare);
    u.pathname = withSuffix(u.pathname, suffix);
    return u.toString();
  } catch {
    return src;
  }
}
