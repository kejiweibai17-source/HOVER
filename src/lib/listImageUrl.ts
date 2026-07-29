/**
 * 列表頁縮圖：unoptimized 時 next/image 不會縮圖，
 * 改指向 WP 已生成的尺寸檔（woocommerce_thumbnail 多為 300x300）。
 *
 * 注意：本站 uploads 常有 -300x300 / -150x150，但沒有 -768x768；
 * 寫錯尺寸會 404 再回退原圖（可達數 MB）造成列表捲動卡頓。
 */
export function toListImageUrl(src: string, maxEdge = 300): string {
  if (!src || typeof src !== "string") return src;

  try {
    const u = new URL(src);

    // Jetpack / WP.com Photon
    if (/(^|\.)wp\.com$/i.test(u.hostname)) {
      u.searchParams.set("w", String(maxEdge));
      u.searchParams.set("quality", "82");
      return u.toString();
    }

    // 已是 WP 尺寸檔（如 -300x300.jpg）— 若偏大再壓到 maxEdge
    const sized = u.pathname.match(/-(\d+)x(\d+)(\.[a-z]+)$/i);
    if (sized) {
      const w = Number(sized[1]);
      const h = Number(sized[2]);
      if (w <= maxEdge && h <= maxEdge) return src;
      u.pathname = u.pathname.replace(
        /-\d+x\d+(\.[a-z]+)$/i,
        `-${maxEdge}x${maxEdge}$1`,
      );
      return u.toString();
    }

    u.pathname = u.pathname.replace(
      /(\.[a-zA-Z]+)$/,
      `-${maxEdge}x${maxEdge}$1`,
    );
    return u.toString();
  } catch {
    return src;
  }
}
