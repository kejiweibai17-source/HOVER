import { NextResponse } from "next/server";
import {
  DEFAULT_ANNOUNCEMENT,
  normalizeAnnouncementSettings,
} from "@/lib/announcementDefaults";

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
      announcement: DEFAULT_ANNOUNCEMENT,
      fallback: true,
    });
  }

  try {
    const res = await fetch(`${base}/wp-json/hover/v1/announcement`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) {
      throw new Error(`Announcement API ${res.status}`);
    }

    const data = await res.json();
    const announcement = normalizeAnnouncementSettings(
      data?.announcement ?? data,
    );

    return NextResponse.json({ ok: true, announcement, fallback: false });
  } catch (error) {
    console.error("[api/announcement]", error);
    return NextResponse.json({
      ok: false,
      announcement: DEFAULT_ANNOUNCEMENT,
      fallback: true,
      message: "無法載入公告列",
    });
  }
}
