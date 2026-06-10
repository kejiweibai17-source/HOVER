// src/app/api/checkout/validate-coupon/route.ts
import { NextResponse } from "next/server";

// 強制宣告為動態路由，防止 build 時出現 DYNAMIC_SERVER_USAGE 錯誤
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BASE = process.env.WC_API_BASE || "https://inf.fjg.mybluehost.me/website_4ad5d5f2";
const CK = process.env.WC_CONSUMER_KEY;
const CS = process.env.WC_CONSUMER_SECRET;

function basicAuth() {
  if (!CK || !CS) return undefined;
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

export async function GET(req: Request) {
  const noCache = { "Cache-Control": "no-store, no-cache, must-revalidate" };

  try {
    const auth = basicAuth();
    if (!auth) {
      return NextResponse.json(
        { valid: false, message: "WooCommerce API 尚未設定 CK/CS" },
        { status: 500, headers: noCache }
      );
    }

    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code")?.trim();

    if (!code) {
      return NextResponse.json(
        { valid: false, message: "缺少折扣碼" },
        { status: 400, headers: noCache }
      );
    }

    const res = await fetch(
      `${BASE}/wp-json/wc/v3/coupons?code=${encodeURIComponent(code)}`,
      {
        headers: { Authorization: auth },
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      console.error("validate coupon fetch error:", res.status, txt);
      return NextResponse.json(
        { valid: false, message: "折扣碼無效或查詢失敗" },
        { status: 200, headers: noCache }
      );
    }

    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) {
      return NextResponse.json(
        { valid: false, message: "找不到此折扣碼" },
        { status: 200, headers: noCache }
      );
    }

    const coupon = arr[0];

    // 過期檢查
    if (coupon.date_expires) {
      const now = new Date();
      const exp = new Date(coupon.date_expires);
      if (exp.getTime() < now.getTime()) {
        return NextResponse.json(
          { valid: false, message: "折扣碼已逾期" },
          { status: 200, headers: noCache }
        );
      }
    }

    const amountNum = Number(coupon.amount || "0");
    if (!amountNum || amountNum <= 0) {
      return NextResponse.json(
        { valid: false, message: "折扣碼金額為 0，無法折抵" },
        { status: 200, headers: noCache }
      );
    }

    return NextResponse.json(
      {
        valid: true,
        code: coupon.code,
        amount: amountNum,
        description: coupon.description || "",
        coupon,
      },
      { headers: noCache }
    );
  } catch (e: any) {
    console.error("validate coupon api error:", e);
    return NextResponse.json(
      { valid: false, message: "系統錯誤，請稍後再試。" },
      { status: 500, headers: noCache }
    );
  }
}