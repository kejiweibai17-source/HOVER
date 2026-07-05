export function isSvgLogo(url: string, mimeType?: string): boolean {
  if (mimeType === "image/svg+xml") return true;
  return /\.svg(\?|#|$)/i.test(url || "");
}

/** Replace fill/stroke colors inside SVG markup (incl. Illustrator <style> classes). */
export function colorizeSvgMarkup(svg: string, color: string): string {
  let out = svg.trim();
  if (!/<svg[\s>]/i.test(out)) return out;

  // HTML inline SVG does not need XML prolog.
  out = out.replace(/<\?xml[^?]*\?>\s*/i, "");

  out = out.replace(/<style([^>]*)>([\s\S]*?)<\/style>/gi, (_, attrs, css) => {
    const nextCss = css
      .replace(/\bfill\s*:\s*(?!none|transparent)[^;"'}\n]+/gi, `fill:${color}`)
      .replace(/\bstroke\s*:\s*(?!none|transparent)[^;"'}\n]+/gi, `stroke:${color}`);
    return `<style${attrs}>${nextCss}</style>`;
  });

  out = out.replace(/\bfill\s*=\s*"(?!none|transparent)[^"]*"/gi, `fill="${color}"`);
  out = out.replace(/\bfill\s*=\s*'(?!none|transparent)[^']*'/gi, `fill='${color}'`);
  out = out.replace(
    /\bstroke\s*=\s*"(?!none|transparent)[^"]*"/gi,
    `stroke="${color}"`,
  );
  out = out.replace(
    /\bstroke\s*=\s*'(?!none|transparent)[^']*'/gi,
    `stroke='${color}'`,
  );
  out = out.replace(/\bfill\s*:\s*(?!none|transparent)[^;"'}]+/gi, `fill:${color}`);
  out = out.replace(/\bstroke\s*:\s*(?!none|transparent)[^;"'}]+/gi, `stroke:${color}`);
  out = out.replace(/currentColor/gi, color);

  out = out.replace(/<svg([^>]*?)>/i, (match, attrs: string) => {
    const style = "width:100%;height:100%;display:block;";
    if (/style="/i.test(attrs)) {
      return `<svg${attrs.replace(/style="/i, `style="${style}`)}>`;
    }
    if (!/\bfill=/i.test(attrs)) {
      return `<svg${attrs} fill="${color}" style="${style}">`;
    }
    return `<svg${attrs} style="${style}">`;
  });

  return out;
}

export function getSvgLogoProxyUrl(url: string, color: string): string {
  const params = new URLSearchParams({
    url,
    color: color || "#ffffff",
  });
  return `/api/footer/svg?${params.toString()}`;
}
