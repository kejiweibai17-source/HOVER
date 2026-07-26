import { NextResponse } from "next/server";
import {
  DEFAULT_CATEGORY_BANNERS,
  fetchCategoryBannerSettings,
  normalizeCategoryBannerSettings,
} from "@/lib/categoryBannerDefaults";

export const revalidate = 60;

export async function GET() {
  try {
    const categoryBanners = await fetchCategoryBannerSettings();
    const fallback = categoryBanners === DEFAULT_CATEGORY_BANNERS;
    return NextResponse.json({ ok: true, categoryBanners, fallback });
  } catch (error) {
    console.error("[api/category-banners]", error);
    return NextResponse.json({
      ok: false,
      categoryBanners: normalizeCategoryBannerSettings(DEFAULT_CATEGORY_BANNERS),
      fallback: true,
      message: "無法載入分類 Banner",
    });
  }
}
