import { NextResponse } from "next/server";
import { buildCategoryNav } from "@/lib/categoryNav";
import { fetchProductCategories } from "@/lib/woo";

export const revalidate = 60;

export async function GET() {
  try {
    const raw = await fetchProductCategories();
    const categories = buildCategoryNav(raw);
    return NextResponse.json({ ok: true, categories });
  } catch (error) {
    console.error("[api/categories]", error);
    return NextResponse.json(
      { ok: false, categories: [], message: "無法載入分類" },
      { status: 200 },
    );
  }
}
