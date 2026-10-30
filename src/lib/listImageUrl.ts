/**
 * 不依賴 Vercel Image Optimization：優先走 Jetpack Photon（WebP／縮圖），
 * 失敗再回退 WordPress 本機已生成的尺寸檔。
 *
 * 商品圖統一 3:4。避開舊的 4:5（600×750）與 1:1（300×300）裁切檔僅作來源參考。
 */

export type ImageRole = "card" | "pdp" | "banner" | "thumb";

const ROLE_MAX: Record<ImageRole, number> = {
  /** 購物車側欄／結帳縮圖（約 90px ×2） */
  thumb: 240,
  /** 列表卡約 22vw；600 足夠 2x */
  card: 600,
  pdp: 1024,
  banner: 1400,
};

const ROLE_QUALITY: Record<ImageRole, number> = {
  thumb: 70,
  card: 72,
  pdp: 78,
  banner: 78,
};

/**
 * 依角色嘗試的 WP 尺寸後綴。
 * 本站實際常有 -600x750（約 200KB PNG），少有 -600x800／-768x1024；
 * 優先順序避免先打 404 再 fallback。
 */
const ROLE_SUFFIXES: Record<ImageRole, string[]> = {
  // 縮圖仍優先 3:4 來源，交由 Photon 縮小（避免 150 方圖被 object-cover 裁怪）
  thumb: ["-600x750", "-300x300", "-150x150"],
  card: ["-600x750", "-600x800", "-768x1024", "-900x1200", "-1024x1024"],
  pdp: [
    "-600x750",
    "-600x800",
    "-768x1024",
    "-900x1200",
    "-1024x1024",
    "-768x768",
  ],
  banner: [
    "-1536x864",
    "-1024x576",
    "-768x432",
    "-1024x1024",
    "-768x768",
    "-300x169",
    "-300x300",
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
            "medium",
            "woocommerce_thumbnail",
            "thumbnail",
            "full",
          ]
        : role === "pdp"
          ? [
              "woocommerce_single",
              "large",
              "medium_large",
              "medium",
              "full",
              "woocommerce_thumbnail",
            ]
          : ["large", "medium_large", "medium", "full"];

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
    const baseSrc =
      role === "banner" ? src : unwrapNonProductRatioUrl(src, role);
    const u = new URL(baseSrc);

    if (isPhotonHost(u.hostname)) {
      return stripPhotonUrl(baseSrc) || baseSrc;
    }

    if (!u.pathname.includes("/wp-content/uploads/")) {
      return baseSrc;
    }

    if (role === "banner") {
      return baseSrc;
    }

    // 縮圖：勿硬拼可能不存在的 -600x750（TEST／新上架常沒生成該尺寸 → 404 死圖）
    // 一律用原圖當 Photon 來源，由 ?w= 縮小即可
    if (role === "thumb") {
      return toFullUploadUrl(baseSrc);
    }

    const sized = u.pathname.match(/-(\d+)x(\d+)(\.[a-z]+)$/i);
    if (sized) {
      const w = Number(sized[1]);
      const h = Number(sized[2]);
      const maxSide = Math.max(w, h);
      // 非方圖且夠大：保留當 Photon 來源（由 ?w= 縮小），勿改成 150 方圖
      if (maxSide >= 400 && !isNearRatio(w, h, 1, 1)) {
        return baseSrc;
      }
      u.pathname = u.pathname.replace(/-\d+x\d+(\.[a-z]+)$/i, "$1");
    }

    const suffix = ROLE_SUFFIXES[role][0];
    u.pathname = withSuffix(u.pathname, suffix);
    return u.toString();
  } catch {
    return src;
  }
}

/**
 * 經 Jetpack Photon 輸出較小 WebP／縮圖（CDN）。
 * Bluehost 原圖 PNG 600×750 ≈ 220KB；Photon ≈ 8–15KB。
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
