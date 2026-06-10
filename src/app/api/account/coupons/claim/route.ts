// src/app/api/account/coupons/claim/route.ts
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
  const r = await fetch(`${NEXTAUTH_URL}/api/account/profile`, { headers: { cookie }, cache: "no-store" });
  if (!r.ok) throw new Error("取得會員資料失敗");
  return r.json();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const kind: "upgrade" | "birthday" = body.kind;

    if (!["upgrade", "birthday"].includes(kind)) {
      return NextResponse.json({ ok: false, message: "領取類型不正確" }, { status: 400 });
    }

    const profile = await fetchProfileWithSameCookies();
    if (!profile?.loggedIn || !profile.customer?.id) {
      return NextResponse.json({ ok: false, message: "請先登入會員" }, { status: 401 });
    }

    const customerId = profile.customer.id;
    const customerEmail = String(profile.customer.email || "").trim().toLowerCase();
    const tier = profile.membership?.tierName;
    const upgradeGift = profile.membership?.upgradeGift || 0;
    const birthdayCredit = profile.membership?.birthdayCredit || 0;

    const amount = kind === "upgrade" ? upgradeGift : birthdayCredit;
    if (amount <= 0) {
      return NextResponse.json({ ok: false, message: "目前等級無對應禮金。" }, { status: 400 });
    }

    const authHeader = { Authorization: basicAuth() };
    const uRes = await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, { headers: authHeader, cache: "no-store" });
    const user = await uRes.json();
    const meta: any[] = Array.isArray(user.meta_data) ? user.meta_data : [];

    // ====== 🎂 規則落實：生日禮 ======
    if (kind === "birthday") {
      const now = new Date();
      const currentMonth = now.getMonth() + 1; 
      
      // 🚨 規則：如未在當月 1 日前完成註冊則不補發，將於隔年發放
      const regDate = new Date(user.date_created);
      if (regDate.getFullYear() === now.getFullYear() && (regDate.getMonth() + 1) === currentMonth) {
         return NextResponse.json({ ok: false, message: "依規定，當月壽星需於當月 1 日前註冊完成，方可領取本年度生日禮！" }, { status: 400 });
      }

      const metaKey = `uf_birthday_claim_${now.getFullYear()}_${currentMonth}`;
      const claimed = meta.find((m) => m.key === metaKey && m.value === "1");
      if (claimed) {
        return NextResponse.json({ ok: true, already: true, message: "本月生日禮金已領取過，請於結帳時使用。" });
      }

      // 💡 個人專屬折扣碼 (防盜、面額100%正確)
      const code = `UFBD-${currentMonth}-${customerId}`; 
      let coupon: any = null;

      const s = await fetch(`${BASE}/wp-json/wc/v3/coupons?code=${code}`, { headers: authHeader });
      const arr = await s.json();
      if (Array.isArray(arr) && arr.length > 0) {
        coupon = arr[0];
      } else {
        // 🚨 規則：發放日起算 30 天逾期失效
        const expires = new Date();
        expires.setDate(expires.getDate() + 30); 

        const c = await fetch(`${BASE}/wp-json/wc/v3/coupons`, {
          method: "POST", headers: { ...authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({
            code,
            discount_type: "fixed_cart",
            amount: String(amount),
            usage_limit: 1, // 只能用一次
            usage_limit_per_user: 1,
            email_restrictions: [customerEmail], // 白名單保護
            description: `${tier} 專屬生日禮金 ${amount} 元`,
            date_expires: expires.toISOString(),
          }),
        });
        coupon = await c.json();
      }

      await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
        method: "PUT", headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ meta_data: [{ key: metaKey, value: "1" }] }),
      });

      return NextResponse.json({ ok: true, already: false, coupon, message: "生日禮金領取成功！(限30天內使用)" });
    }

    // ====== 🔼 規則落實：升等禮 ======
    // 🚨 修復：加上等級名稱，避免升級後無法領取下一個階段的禮物
    const uKey = `uf_upgrade_claimed_${tier}`;
    const uClaimed = meta.find((m) => m.key === uKey && m.value === "1");

    if (uClaimed) {
      return NextResponse.json({ ok: true, already: true, message: `您已領取過 ${tier} 的升等禮囉。` });
    }

    // 💡 個人專屬折扣碼
    let englishTier = "BRONZE";
    if (tier === "U銀貴賓") englishTier = "SILVER";
    if (tier === "U金貴賓") englishTier = "GOLD";
    if (tier === "UVIP貴賓") englishTier = "VIP";
    if (tier === "UVVIP貴賓") englishTier = "VVIP";

    const upgradeCode = `UFUP-${englishTier}-${customerId}`;
    let coupon: any = null;

    const s2 = await fetch(`${BASE}/wp-json/wc/v3/coupons?code=${upgradeCode}`, { headers: authHeader });
    const arr2 = await s2.json();

    if (Array.isArray(arr2) && arr2.length > 0) {
      coupon = arr2[0];
    } else {
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1); // 升等禮效期給1年

      const c2 = await fetch(`${BASE}/wp-json/wc/v3/coupons`, {
        method: "POST", headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          code: upgradeCode,
          discount_type: "fixed_cart",
          amount: String(amount),
          usage_limit: 1,
          usage_limit_per_user: 1,
          email_restrictions: [customerEmail], // 白名單保護
          date_expires: expires.toISOString(),
          description: `${tier} 專屬升等禮購物金 ${amount} 元`,
        }),
      });
      coupon = await c2.json();
    }

    await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
      method: "PUT", headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ meta_data: [{ key: uKey, value: "1" }] }),
    });

    return NextResponse.json({ ok: true, already: false, coupon, message: "升等禮領取成功！" });

  } catch (err) {
    console.error("claim coupon error:", err);
    return NextResponse.json({ ok: false, message: "系統錯誤" }, { status: 500 });
  }
}