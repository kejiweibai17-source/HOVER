/**
 * 不依賴 Vercel Image Optimization：改指向 WordPress 已生成的尺寸檔。
 *
 * 商品圖統一 3:4。避開舊的 4:5（600×750）與 1:1（300×300）裁切檔。
 */

export type ImageRole = "card" | "pdp" | "banner" | "thumb";

const ROLE_MAX: Record<ImageRole, number> = {
  thumb: 200,
  card: 900,
  pdp: 1024,
  banner: 1536,
};

/** 依角色嘗試的 WP 尺寸後綴（card 避開過小的 300×300） */
const ROLE_SUFFIXES: Record<ImageRole, string[]> = {
  thumb: ["-150x200", "-150x150", "-300x300"],
  card: ["-600x800", "-600x750", "-768x1024", "-900x1200", "-1024x1024"],
  pdp: [
    "-900x1200",
    "-768x1024",
    "-600x800",
    "-600x750",
    "-1024x1024",
    "-768x768",
    "-300x300",
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

/** 寬高比是否接近目標（容許誤差） */
function isNearRatio(w: number, h: number, rw: number, rh: number, tol = 0.03): boolean {
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
 * 商品圖：方圖／過小縮圖（如 300×300）還原原圖，再選較大尺寸。
 */
export function unwrapNonProductRatioUrl(src: string, role: ImageRole = "card"): string {
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
  // 已有 -WxH 則先剝掉再加
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

  // card：優先較大現有縮圖，避免卡在 300×300
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

/**
 * 沒有 sizes 物件時：依角色改寫 uploads URL 嘗試常見後綴。
 * 元件端應搭配 onError 回退原圖。
 */
export function toOptimizedImageUrl(
  src: string,
  role: ImageRole = "card",
): string {
  if (!src || typeof src !== "string") return src;

  try {
    const baseSrc =
      role === "banner" ? src : unwrapNonProductRatioUrl(src, role);
    const u = new URL(baseSrc);
    const maxEdge = ROLE_MAX[role];

    // Jetpack / WP.com Photon
    if (/(^|\.)wp\.com$/i.test(u.hostname)) {
      u.searchParams.set("w", String(maxEdge));
      u.searchParams.set("quality", "80");
      return u.toString();
    }

    // 非 WP uploads 不動
    if (!u.pathname.includes("/wp-content/uploads/")) {
      return baseSrc;
    }

    // 內頁／橫幅：用原圖（已 unwrap 掉錯誤比例縮圖）
    if (role === "pdp" || role === "banner") {
      return baseSrc;
    }

    // 列表 card：過小／方圖不沿用，改挑較大後綴
    const sized = u.pathname.match(/-(\d+)x(\d+)(\.[a-z]+)$/i);
    if (sized) {
      const w = Number(sized[1]);
      const h = Number(sized[2]);
      const maxSide = Math.max(w, h);
      if (maxSide >= 560 && maxSide <= maxEdge * 1.25 && !isNearRatio(w, h, 1, 1)) {
        return baseSrc;
      }
      // 過小或方圖：還原原圖路徑再套用較大後綴
      u.pathname = u.pathname.replace(/-\d+x\d+(\.[a-z]+)$/i, "$1");
    }

    const suffix = ROLE_SUFFIXES[role][0];
    u.pathname = withSuffix(u.pathname, suffix);
    return u.toString();
  } catch {
    return src;
  }
}

/** @deprecated 使用 toOptimizedImageUrl(src, 'card') */
export function toListImageUrl(src: string, maxEdge = 300): string {
  const role: ImageRole =
    maxEdge <= 150 ? "thumb" : maxEdge <= 400 ? "card" : maxEdge <= 900 ? "pdp" : "banner";
  return toOptimizedImageUrl(src, role);
}

export function getFallbackSuffixes(role: ImageRole): string[] {
  return ROLE_SUFFIXES[role].slice(1);
}

export function applyWpSuffix(src: string, suffix: string): string {
  try {
    const u = new URL(src);
    u.pathname = withSuffix(u.pathname, suffix);
    return u.toString();
  } catch {
    return src;
  }
}
