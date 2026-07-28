import { NextResponse } from "next/server";
import {
  DEFAULT_CATEGORY_BANNERS,
  fetchCategoryBannerSettings,
  normalizeCategoryBannerSettings,
} from "@/lib/categoryBannerDefaults";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categoryBanners = await fetchCategoryBannerSettings();
    const fallback = categoryBanners === DEFAULT_CATEGORY_BANNERS;
    return NextResponse.json(
      { ok: true, categoryBanners, fallback },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  } catch (error) {
    console.error("[api/category-banners]", error);
    return NextResponse.json(
      {
        ok: false,
        categoryBanners: normalizeCategoryBannerSettings(
          DEFAULT_CATEGORY_BANNERS,
        ),
        fallback: true,
        message: "無法載入分類 Banner",
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      },
    );
  }
}
