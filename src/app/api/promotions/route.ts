import { NextResponse } from "next/server";
import {
  evaluatePromotions,
  type PromotionCartItem,
} from "@/lib/promotions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function basicAuth(): string {
  const key = process.env.WC_CONSUMER_KEY || "";
  const secret = process.env.WC_CONSUMER_SECRET || "";
  if (!key || !secret) return "";
  return `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const items: PromotionCartItem[] = Array.isArray(body?.items)
      ? body.items.slice(0, 100)
      : [];
    if (!items.length) {
      return NextResponse.json({ ok: true, promotions: [] });
    }
    const auth = basicAuth();
    if (!auth) {
      return NextResponse.json(
        { ok: false, promotions: [], message: "商品服務尚未設定" },
        { status: 503 },
      );
    }
    const promotions = await evaluatePromotions(items, auth, {
      cache: "no-store",
    });
    return NextResponse.json({ ok: true, promotions });
  } catch (error) {
    console.error("[api/promotions]", error);
    return NextResponse.json(
      { ok: false, promotions: [], message: "促銷活動載入失敗" },
      { status: 500 },
    );
  }
}
