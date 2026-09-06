"use client";

import { useMemo, useState } from "react";
import Image, { type ImageProps } from "next/image";
import {
  applyWpSuffix,
  getFallbackSuffixes,
  toFullUploadUrl,
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
    const normalized = toOptimizedImageUrl(original, role);

    if (src && src !== original) {
      const fromSrc = toOptimizedImageUrl(src, role);
      if (fromSrc) list.push(fromSrc);
    }

    // 已存在的尺寸檔：夠大才優先（避免先載 300×300 糊圖）
    const sized = original.match(/-(\d+)x(\d+)\.[a-z]+$/i);
    if (sized) {
      const maxSide = Math.max(Number(sized[1]), Number(sized[2]));
      if (maxSide >= 560) list.push(original);
    }

    list.push(normalized);
    for (const suffix of getFallbackSuffixes(role)) {
      const next = applyWpSuffix(toFullUploadUrl(original), suffix);
      if (!list.includes(next)) list.push(next);
    }
    const full = toFullUploadUrl(original);
    if (!list.includes(full)) list.push(full);
    if (!list.includes(original)) list.push(original);
    return Array.from(new Set(list.filter(Boolean)));
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
