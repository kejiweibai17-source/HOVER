import { NextResponse } from "next/server";
import {
  FALLBACK_HERO,
  fetchHeroSettings,
  normalizeHeroSettings,
} from "@/lib/heroDefaults";

export const revalidate = 60;

export async function GET() {
  try {
    const hero = await fetchHeroSettings();
    const fallback = hero === FALLBACK_HERO;

    return NextResponse.json({ ok: true, hero, fallback });
  } catch (error) {
    console.error("[api/hero]", error);
    return NextResponse.json({
      ok: false,
      hero: normalizeHeroSettings(FALLBACK_HERO),
      fallback: true,
      message: "無法載入首頁主圖",
    });
  }
}
