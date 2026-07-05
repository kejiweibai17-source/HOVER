import { NextResponse } from "next/server";
import { DEFAULT_POPUP, normalizePopupSettings } from "@/lib/popupDefaults";

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
      popup: DEFAULT_POPUP,
      fallback: true,
    });
  }

  try {
    const res = await fetch(`${base}/wp-json/hover/v1/popup`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`Popup API ${res.status}`);
    }

    const data = await res.json();
    const popup = normalizePopupSettings(data?.popup ?? data);

    return NextResponse.json({ ok: true, popup, fallback: false });
  } catch (error) {
    console.error("[api/popup]", error);
    return NextResponse.json({
      ok: false,
      popup: DEFAULT_POPUP,
      fallback: true,
      message: "無法載入首頁公告",
    });
  }
}
