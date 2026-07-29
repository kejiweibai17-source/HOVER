"use client";

import { useMemo, useState } from "react";
import Image, { type ImageProps } from "next/image";
import {
  applyWpSuffix,
  getFallbackSuffixes,
  toOptimizedImageUrl,
  type ImageRole,
} from "@/lib/listImageUrl";

type Props = Omit<ImageProps, "src" | "onError"> & {
  src: string;
  /** card=列表／首頁商品；pdp=商品大圖；banner=橫幅；thumb=極小 */
  role?: ImageRole;
  /** 已知的原圖（縮圖 404 時回退） */
  fullSrc?: string;
};

/**
 * 不經 Vercel 優化：優先載入 WP 縮圖，失敗再回退原圖／其他尺寸。
 */
export default function OptimizedImage({
  src,
  role = "card",
  fullSrc,
  alt,
  unoptimized = true,
  ...rest
}: Props) {
  const original = fullSrc || src;
  const candidates = useMemo(() => {
    const list: string[] = [];
    const primary = toOptimizedImageUrl(original, role);
    list.push(primary);
    for (const suffix of getFallbackSuffixes(role)) {
      const next = applyWpSuffix(original, suffix);
      if (!list.includes(next)) list.push(next);
    }
    if (!list.includes(original)) list.push(original);
    // 若呼叫端已傳入不同 src（例如 REST sizes），也放最前
    if (src && src !== primary && src !== original) {
      list.unshift(src);
    }
    return list;
  }, [original, role, src]);

  const [index, setIndex] = useState(0);
  const current = candidates[Math.min(index, candidates.length - 1)] || original;

  return (
    <Image
      {...rest}
      alt={alt}
      src={current}
      unoptimized={unoptimized}
      onError={() => {
        setIndex((i) => (i + 1 < candidates.length ? i + 1 : i));
      }}
    />
  );
}
