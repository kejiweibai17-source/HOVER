import { NextResponse } from "next/server";
import { DEFAULT_FOOTER, normalizeFooterSettings } from "@/lib/footerDefaults";

export const revalidate = 60;

function getWordPressBase(): string {
  const base = process.env.WC_API_BASE || process.env.WORDPRESS_API_URL || "";
  return base.replace(/\/$/, "");
}

export async function GET() {
  const base = getWordPressBase();

  if (!base) {
    return NextResponse.json({
      ok: true,
      footer: DEFAULT_FOOTER,
      fallback: true,
    });
  }

  try {
    const res = await fetch(`${base}/wp-json/hover/v1/footer`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`Footer API ${res.status}`);
    }

    const data = await res.json();
    const footer = normalizeFooterSettings(data?.footer ?? data);

    return NextResponse.json({ ok: true, footer, fallback: false });
  } catch (error) {
    console.error("[api/footer]", error);
    return NextResponse.json({
      ok: false,
      footer: DEFAULT_FOOTER,
      fallback: true,
      message: "無法載入頁尾設定",
    });
  }
}
