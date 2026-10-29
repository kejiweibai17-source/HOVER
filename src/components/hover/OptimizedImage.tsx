"use client";

import { useMemo, useState } from "react";
import Image, { type ImageProps } from "next/image";
import {
  stripPhotonUrl,
  toDirectWpImageUrl,
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
 * 優先 Photon（小檔 WebP），失敗再回退 WP 尺寸檔／原圖。
 * 候選鏈刻意縮短，避免連續 404 拖慢列表。
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
    const photon = toOptimizedImageUrl(original, role);
    const direct = toDirectWpImageUrl(stripPhotonUrl(original) || original, role);
    const full = toFullUploadUrl(stripPhotonUrl(original) || original);

    if (photon) list.push(photon);
    if (direct && !list.includes(direct)) list.push(direct);
    if (full && !list.includes(full)) list.push(full);
    if (original && !list.includes(original)) list.push(original);
    if (src && src !== original && !list.includes(src)) list.push(src);
    return list.filter(Boolean);
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
