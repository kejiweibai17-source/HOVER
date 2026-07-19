// src/app/api/account/coupons/available/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  birthdayCouponCode,
  couponKindFromCode,
  welcomeCouponCode,
} from "@/lib/membership";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BASE = process.env.WC_API_BASE!;
const CK = process.env.WC_CONSUMER_KEY!;
const CS = process.env.WC_CONSUMER_SECRET!;
const NEXTAUTH_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";

function basicAuth() {
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

async function fetchProfileWithSameCookies() {
  const cookie = headers().get("cookie") || "";
  const r = await fetch(`${NEXTAUTH_URL}/api/account/profile`, {
    headers: { cookie },
    cache: "no-store",
  });
  if (!r.ok) throw new Error("取得會員資料失敗");
  return r.json();
}

function isExpired(coupon: any) {
  const expiresStr = coupon?.date_expires || coupon?.date_expires_gmt;
  if (!expiresStr) return false;
  return new Date(expiresStr).getTime() < Date.now();
}

function isDepleted(coupon: any) {
  const usageCount = Number(coupon?.usage_count ?? 0) || 0;
  const usageLimit = Number(coupon?.usage_limit ?? 0) || 0;
  if (usageLimit > 0 && usageCount >= usageLimit) return true;
  return false;
}

function kindLabel(kind: string) {
  switch (kind) {
    case "welcome":
    case "legacy":
      return "入會禮";
    case "birthday":
      return "生日禮";
    case "promo":
      return "活動優惠";
    case "vip":
      return "臻享專屬";
    case "ref_friend":
      return "推薦禮";
    case "ref_ambassador":
      return "推薦回饋";
    default:
      return "專屬優惠";
  }
}

function belongsToEmail(coupon: any, email: string) {
  const emails: string[] = Array.isArray(coupon?.email_restrictions)
    ? coupon.email_restrictions.map((e: any) => String(e).trim().toLowerCase())
    : [];
  if (!emails.length) return false;
  return emails.includes(email);
}

function mapCoupon(coupon: any) {
  const code = String(coupon.code || "").toUpperCase();
  const kind = couponKindFromCode(code);
  return {
    kind,
    kindLabel: kindLabel(kind),
    code,
    amount: Number(coupon.amount) || 0,
    discountType: coupon.discount_type || "fixed_cart",
    description: coupon.description || "",
    minimumAmount: Number(coupon.minimum_amount || 0) || 0,
    expires: coupon.date_expires || null,
    coupon,
  };
}

async function fetchCouponByCode(code: string, authHeader: HeadersInit) {
  const res = await fetch(
    `${BASE}/wp-json/wc/v3/coupons?code=${encodeURIComponent(code)}`,
    { headers: authHeader, cache: "no-store" },
  );
  if (!res.ok) return null;
  const arr = await res.json();
  return Array.isArray(arr) && arr[0] ? arr[0] : null;
}

export async function GET() {
  try {
    const profile = await fetchProfileWithSameCookies();
    if (!profile?.loggedIn || !profile?.customer?.id) {
      return NextResponse.json({ ok: true, available: [] });
    }

    const customerId = profile.customer.id;
    const customerEmail = String(profile.customer.email || "")
      .trim()
      .toLowerCase();
    const authHeader = { Authorization: basicAuth() };
    const month = new Date().getMonth() + 1;

    // 精確查詢：入會禮／當月生日禮／推薦註冊禮（避免 coupon 過多時掃不到）
    const knownCodes = [
      welcomeCouponCode(customerId),
      birthdayCouponCode(customerId, month),
      `UFFRD-${customerId}`,
    ];

    const knownResults = await Promise.all(
      knownCodes.map((code) => fetchCouponByCode(code, authHeader)),
    );

    // 再掃近期券，補抓其他 Email 綁定專屬碼（活動／客服補發等）
    const couponsRes = await fetch(
      `${BASE}/wp-json/wc/v3/coupons?per_page=100&orderby=date&order=desc`,
      { headers: authHeader, cache: "no-store" },
    );
    const recent = couponsRes.ok ? await couponsRes.json() : [];

    const byCode = new Map<string, any>();
    for (const c of [...knownResults, ...(Array.isArray(recent) ? recent : [])]) {
      if (!c) continue;
      if (isExpired(c) || isDepleted(c)) continue;
      if (!belongsToEmail(c, customerEmail)) continue;
      const key = String(c.code || "").toUpperCase();
      if (!key || byCode.has(key)) continue;
      byCode.set(key, c);
    }

    const available = Array.from(byCode.values())
      .map(mapCoupon)
      .sort((a, b) => {
        const rank = (k: string) =>
          k === "welcome" || k === "legacy"
            ? 0
            : k === "birthday"
              ? 1
              : k === "ref_friend"
                ? 2
                : 3;
        return rank(a.kind) - rank(b.kind);
      });

    return NextResponse.json({ ok: true, available });
  } catch (e) {
    console.error("available coupon error:", e);
    return NextResponse.json({ ok: true, available: [] });
  }
}
