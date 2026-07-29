/**
 * 不依賴 Vercel Image Optimization：改指向 WordPress 已生成的尺寸檔。
 *
 * 本站實測（Bluehost uploads）：
 * - 商品方圖常見：-150x150、-300x300（無 -768x768）
 * - 橫圖常見：-300x169、-768x432、-1024x576、-1536x864
 */

export type ImageRole = "card" | "pdp" | "banner" | "thumb";

const ROLE_MAX: Record<ImageRole, number> = {
  thumb: 150,
  card: 300,
  pdp: 1024,
  banner: 1536,
};

/** 依角色嘗試的 WP 尺寸後綴（先試較小的、較常見的） */
const ROLE_SUFFIXES: Record<ImageRole, string[]> = {
  thumb: ["-150x150", "-300x300"],
  card: ["-300x300", "-150x150"],
  pdp: [
    "-1024x1024",
    "-1024x576",
    "-768x768",
    "-768x432",
    "-1536x864",
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

  const order: Array<keyof NonNullable<typeof sizes>> =
    role === "thumb"
      ? ["thumbnail", "woocommerce_thumbnail", "medium", "full"]
      : role === "card"
        ? ["woocommerce_thumbnail", "medium", "thumbnail", "medium_large", "full"]
        : role === "pdp"
          ? [
              "woocommerce_single",
              "large",
              "medium_large",
              "medium",
              "woocommerce_thumbnail",
              "full",
            ]
          : ["large", "medium_large", "medium", "full"];

  for (const key of order) {
    const url = sizes[key];
    if (url && String(url).trim()) return String(url).trim();
  }
  return fallbackSrc || "";
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
    const u = new URL(src);
    const maxEdge = ROLE_MAX[role];

    // Jetpack / WP.com Photon
    if (/(^|\.)wp\.com$/i.test(u.hostname)) {
      u.searchParams.set("w", String(maxEdge));
      u.searchParams.set("quality", "80");
      return u.toString();
    }

    // 非 WP uploads 不動
    if (!u.pathname.includes("/wp-content/uploads/")) {
      return src;
    }

    // 內頁／橫幅：不要臆造或沿用可能不存在的 -1024x1024 等後綴
    if (role === "pdp" || role === "banner") {
      return src;
    }

    // 已是夠小的尺寸檔
    const sized = u.pathname.match(/-(\d+)x(\d+)(\.[a-z]+)$/i);
    if (sized) {
      const w = Number(sized[1]);
      const h = Number(sized[2]);
      if (Math.max(w, h) <= maxEdge) return src;
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
