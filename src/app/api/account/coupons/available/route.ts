// src/app/api/account/coupons/available/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";

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
  const usageLimit = coupon?.usage_limit;
  if (usageLimit !== null && usageLimit !== undefined && usageLimit > 0) {
    if (usageCount >= usageLimit) return false;
  }
  return false;
}

function pickKind(codeRaw: string) {
  const code = String(codeRaw || "").toUpperCase();
  if (code.startsWith("UFUP-")) return "upgrade";
  if (code.startsWith("UFBD-")) return "birthday";
  if (code.startsWith("UFFRD-")) return "ref_friend_50";
  if (code.startsWith("UFAMB-")) return "ref_ambassador_200";
  return "other";
}

export async function GET() {
  try {
    const profile = await fetchProfileWithSameCookies();
    if (!profile?.loggedIn || !profile?.customer?.id) {
      return NextResponse.json({ ok: true, available: [] });
    }

    const customerEmail = String(profile.customer.email || "").trim().toLowerCase();
    const authHeader = { Authorization: basicAuth() };

    // 只需要抓 Coupon 列表，不用再抓使用者 Meta 了，因為我們改用白名單機制！
    const couponsRes = await fetch(`${BASE}/wp-json/wc/v3/coupons?per_page=100&orderby=date&order=desc`, {
      headers: authHeader, cache: "no-store"
    });

    if (!couponsRes.ok) return NextResponse.json({ ok: true, available: [] });
    const arr = await couponsRes.json();

    // 💡 核心篩選：極度純淨的判斷邏輯
    const mine = arr.filter((c: any) => {
      if (!c) return false;
      if (isExpired(c)) return false;
      if (isDepleted(c)) return false;

      const emails: string[] = Array.isArray(c.email_restrictions)
        ? c.email_restrictions.map((e: any) => String(e).trim().toLowerCase())
        : [];

      // 因為你的所有禮金、推薦碼，現在都嚴格綁定了使用者的 Email，
      // 所以只要白名單裡面有他的信箱，這張券就屬於他！
      if (emails.length > 0) {
        return emails.includes(customerEmail);
      }

      return false; // 不顯示共用券或其他不相干的券
    });

    const available = mine.map((coupon: any) => {
      const code = String(coupon.code || "");
      return {
        kind: pickKind(code),
        code,
        amount: Number(coupon.amount) || 0,
        description: coupon.description || "",
        expires: coupon.date_expires || null,
        coupon,
      };
    });

    return NextResponse.json({ ok: true, available });
  } catch (e) {
    console.error("available coupon error:", e);
    return NextResponse.json({ ok: true, available: [] });
  }
}