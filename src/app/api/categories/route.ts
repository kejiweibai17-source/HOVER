import { NextResponse } from "next/server";
import {
  buildCategoryNav,
  FALLBACK_NAV_CATEGORIES,
} from "@/lib/categoryNav";
import { fetchProductCategories } from "@/lib/woo";

export const revalidate = 60;

export async function GET() {
  try {
    const raw = await fetchProductCategories();
    const built = buildCategoryNav(raw);
    const categories =
      built.length > 0 ? built : FALLBACK_NAV_CATEGORIES;
    return NextResponse.json({
      ok: true,
      categories,
      fallback: built.length === 0,
    });
  } catch (error) {
    console.error("[api/categories]", error);
    return NextResponse.json(
      {
        ok: false,
        categories: FALLBACK_NAV_CATEGORIES,
        fallback: true,
        message: "無法載入分類",
      },
      { status: 200 },
    );
  }
}
