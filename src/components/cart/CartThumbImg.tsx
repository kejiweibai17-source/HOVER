"use client";

import { useMemo, useState } from "react";
import {
  stripPhotonUrl,
  toCartThumbUrl,
  toFullUploadUrl,
} from "@/lib/listImageUrl";

type Props = {
  src?: string | null;
  alt?: string;
  width: number;
  height: number;
  className?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
};

/**
 * 購物車／結帳縮圖：Photon 小圖優先，404 時回退原圖（避免硬拼尺寸檔死圖）
 */
export default function CartThumbImg({
  src,
  alt = "",
  width,
  height,
  className,
  loading = "eager",
  fetchPriority,
}: Props) {
  const candidates = useMemo(() => {
    const raw = String(src || "").trim();
    if (!raw) return [] as string[];
    const list: string[] = [];
    const thumb = toCartThumbUrl(raw);
    const full = toFullUploadUrl(stripPhotonUrl(raw) || raw);
    if (thumb) list.push(thumb);
    if (full && !list.includes(full)) list.push(full);
    if (raw && !list.includes(raw)) list.push(raw);
    return list;
  }, [src]);

  const [index, setIndex] = useState(0);
  const current = candidates[Math.min(index, Math.max(candidates.length - 1, 0))];

  if (!current) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Photon 小圖；需 onError 回退
    <img
      src={current}
      alt={alt}
      width={width}
      height={height}
      decoding="async"
      loading={loading}
      fetchPriority={fetchPriority}
      className={className}
      onError={() => {
        setIndex((i) => (i + 1 < candidates.length ? i + 1 : i));
      }}
    />
  );
}
