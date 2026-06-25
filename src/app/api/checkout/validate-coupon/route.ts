// src/app/api/checkout/validate-coupon/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BASE = process.env.WC_API_BASE || "https://inf.fjg.mybluehost.me/website_4ad5d5f2";
const CK = process.env.WC_CONSUMER_KEY;
const CS = process.env.WC_CONSUMER_SECRET;

function basicAuth() {
  if (!CK || !CS) return undefined;
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

function calcDiscountAmount(
  coupon: any,
  subtotalAfterMember: number,
): number | null {
  const type = String(coupon.discount_type || "fixed_cart");
  const amount = Number(coupon.amount || 0);
  if (!amount || amount <= 0) return null;

  if (type === "percent") {
    return Math.round(subtotalAfterMember * (amount / 100));
  }
  if (type === "fixed_cart") {
    return Math.min(amount, subtotalAfterMember);
  }
  if (type === "fixed_product") {
    return Math.min(amount, subtotalAfterMember);
  }
  return null;
}

export async function POST(req: Request) {
  const noCache = { "Cache-Control": "no-store, no-cache, must-revalidate" };

  try {
    const auth = basicAuth();
    if (!auth) {
      return NextResponse.json(
        { valid: false, message: "WooCommerce API 尚未設定" },
        { status: 500, headers: noCache },
      );
    }

    const body = await req.json().catch(() => ({}));
    const code = String(body.code || "").trim();
    const subtotalAfterMember = Math.max(0, Number(body.subtotalAfterMember) || 0);

    if (!code) {
      return NextResponse.json(
        { valid: false, message: "缺少折扣碼" },
        { status: 400, headers: noCache },
      );
    }

    const res = await fetch(
      `${BASE}/wp-json/wc/v3/coupons?code=${encodeURIComponent(code)}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );

    if (!res.ok) {
      return NextResponse.json(
        { valid: false, message: "折扣碼無效或查詢失敗" },
        { status: 200, headers: noCache },
      );
    }

    const arr = await res.json();
    if (!Array.isArray(arr) || arr.length === 0) {
      return NextResponse.json(
        { valid: false, message: "找不到此折扣碼" },
        { status: 200, headers: noCache },
      );
    }

    const coupon = arr[0];

    if (coupon.date_expires) {
      const exp = new Date(coupon.date_expires);
      if (exp.getTime() < Date.now()) {
        return NextResponse.json(
          { valid: false, message: "折扣碼已逾期" },
          { status: 200, headers: noCache },
        );
      }
    }

    const usageLimit = Number(coupon.usage_limit || 0);
    const usageCount = Number(coupon.usage_count || 0);
    if (usageLimit > 0 && usageCount >= usageLimit) {
      return NextResponse.json(
        { valid: false, message: "折扣碼已達使用上限" },
        { status: 200, headers: noCache },
      );
    }

    const minAmount = Number(coupon.minimum_amount || 0);
    if (minAmount > 0 && subtotalAfterMember < minAmount) {
      return NextResponse.json(
        {
          valid: false,
          message: `此折扣碼需滿 NT$${minAmount.toLocaleString()} 才可使用`,
        },
        { status: 200, headers: noCache },
      );
    }

    const emailRestrictions: string[] = Array.isArray(coupon.email_restrictions)
      ? coupon.email_restrictions.map((e: string) => String(e).toLowerCase())
      : [];
    if (emailRestrictions.length > 0) {
      const session = await getServerSession(authOptions);
      const userEmail = String(session?.user?.email || "").trim().toLowerCase();
      if (!userEmail || !emailRestrictions.includes(userEmail)) {
        return NextResponse.json(
          { valid: false, message: "此折扣碼僅限指定會員使用" },
          { status: 200, headers: noCache },
        );
      }
    }

    const discount = calcDiscountAmount(coupon, subtotalAfterMember);
    if (discount == null || discount <= 0) {
      return NextResponse.json(
        { valid: false, message: "目前訂單不符合此折扣碼使用條件" },
        { status: 200, headers: noCache },
      );
    }

    const label =
      coupon.description ||
      (coupon.discount_type === "percent"
        ? `${coupon.amount}% 折扣`
        : `折 NT$${Number(coupon.amount).toLocaleString()}`);

    return NextResponse.json(
      {
        valid: true,
        code: coupon.code,
        amount: discount,
        label,
        discountType: coupon.discount_type,
        coupon,
      },
      { headers: noCache },
    );
  } catch (e) {
    console.error("validate coupon api error:", e);
    return NextResponse.json(
      { valid: false, message: "系統錯誤，請稍後再試。" },
      { status: 500, headers: noCache },
    );
  }
}

/** GET 保留向下相容 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim() || "";
  const fakeReq = new Request(req.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, subtotalAfterMember: 999999 }),
  });
  return POST(fakeReq);
}
