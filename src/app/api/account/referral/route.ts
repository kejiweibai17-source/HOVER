// src/app/api/account/referral/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";

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

function genRefCode(customerId: number) {
  return `UF${customerId}`;
}

export async function GET() {
  try {
    const profile = await fetchProfileWithSameCookies();
    if (!profile?.loggedIn) {
      return NextResponse.json({ ok: false, message: "未登入" }, { status: 401 });
    }

    const authHeader = { Authorization: basicAuth() };

    let customerId: number | null = profile?.customer?.id ?? null;
    const email = profile?.customer?.email;

    // ✅ 1) 如果 profile 沒 id，就用 email 去 WC 找 / 建 customer
    if (!customerId && email) {
      const findRes = await fetch(
        `${BASE}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}`,
        { headers: authHeader, cache: "no-store" }
      );
      const arr = await findRes.json();

      if (Array.isArray(arr) && arr.length > 0) {
        customerId = arr[0].id;
      } else {
        // ✅ 建一個 WC customer（給社群註冊的人補上）
        const createRes = await fetch(`${BASE}/wp-json/wc/v3/customers`, {
          method: "POST",
          headers: { ...authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            username: email.split("@")[0],
            meta_data: [{ key: "email_verified", value: "1" }], // 社群登入就視為已驗證
          }),
        });
        const created = await createRes.json();
        if (createRes.ok && created?.id) {
          customerId = created.id;
        }
      }
    }

    if (!customerId) {
      return NextResponse.json({ ok: false, message: "找不到會員ID" }, { status: 400 });
    }

    // ✅ 2) 讀 meta，看有沒有推薦碼
    const uRes = await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
      headers: authHeader,
      cache: "no-store",
    });
    const user = await uRes.json();
    const meta: any[] = Array.isArray(user.meta_data) ? user.meta_data : [];

    let refCode = meta.find((m) => m.key === "uf_ref_code")?.value as string | undefined;

    if (!refCode) {
      refCode = genRefCode(customerId);
      await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          meta_data: [{ key: "uf_ref_code", value: refCode }],
        }),
      });
    }

    const origin = process.env.NEXT_PUBLIC_SITE_URL || NEXTAUTH_URL;
    const referralLink = `${origin}/register?ref=${encodeURIComponent(refCode)}`;

    return NextResponse.json({
      ok: true,
      refCode,
      referralLink,
      friendReward: 50,
      ambassadorReward: 200,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, message: e.message || "error" }, { status: 500 });
  }
}
