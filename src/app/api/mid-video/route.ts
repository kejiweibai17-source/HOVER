import { NextResponse } from "next/server";
import {
  DEFAULT_MID_VIDEO,
  normalizeMidVideoSettings,
  fetchMidVideoSettings,
} from "@/lib/midVideoDefaults";

export const revalidate = 60;

export async function GET() {
  try {
    const midVideo = await fetchMidVideoSettings();
    const fallback = midVideo === DEFAULT_MID_VIDEO && !midVideo.enabled;
    return NextResponse.json({ ok: true, midVideo, fallback });
  } catch (error) {
    console.error("[api/mid-video]", error);
    return NextResponse.json({
      ok: false,
      midVideo: normalizeMidVideoSettings(DEFAULT_MID_VIDEO),
      fallback: true,
    });
  }
}
