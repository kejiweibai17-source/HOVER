// src/app/api/account/coupons/claim/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  HOVER_MEMBERSHIP_META,
  MEMBERSHIP_RULES,
  birthdayCouponCode,
  buildGiftCouponPayload,
  welcomeCouponCode,
} from "@/lib/membership";

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

async function findOrCreateCoupon(
  authHeader: Record<string, string>,
  payload: ReturnType<typeof buildGiftCouponPayload>,
) {
  const s = await fetch(
    `${BASE}/wp-json/wc/v3/coupons?code=${encodeURIComponent(payload.code)}`,
    { headers: authHeader },
  );
  const arr = await s.json();
  if (Array.isArray(arr) && arr.length > 0) return arr[0];

  const c = await fetch(`${BASE}/wp-json/wc/v3/coupons`, {
    method: "POST",
    headers: { ...authHeader, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return c.json();
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const kind: "welcome" | "birthday" | "upgrade" = body.kind;

    const normalizedKind =
      kind === "upgrade" ? "welcome" : kind;

    if (!["welcome", "birthday"].includes(normalizedKind)) {
      return NextResponse.json(
        { ok: false, message: "領取類型不正確" },
        { status: 400 },
      );
    }

    const profile = await fetchProfileWithSameCookies();
    if (!profile?.loggedIn || !profile.customer?.id) {
      return NextResponse.json(
        { ok: false, message: "請先登入會員" },
        { status: 401 },
      );
    }

    const customerId = profile.customer.id;
    const customerEmail = String(profile.customer.email || "")
      .trim()
      .toLowerCase();
    const membership = profile.membership;
    const tierLabel = membership?.tierLabel || "品牌好友";

    const authHeader = { Authorization: basicAuth() };
    const uRes = await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
      headers: authHeader,
      cache: "no-store",
    });
    const user = await uRes.json();
    const meta: any[] = Array.isArray(user.meta_data) ? user.meta_data : [];

    if (normalizedKind === "welcome") {
      const welcomeKey = HOVER_MEMBERSHIP_META.welcomeClaimed;
      if (meta.find((m) => m.key === welcomeKey && m.value === "1")) {
        return NextResponse.json({
          ok: true,
          already: true,
          message: "入會禮已領取過，請至優惠券查看。",
        });
      }

      const amount = membership?.welcomeGift || MEMBERSHIP_RULES.welcomeGift;
      const code = welcomeCouponCode(customerId);
      const coupon = await findOrCreateCoupon(
        authHeader,
        buildGiftCouponPayload({
          code,
          amount,
          email: customerEmail,
          description: `HOVER FRIENDS 入會禮 NT$${amount}（單筆滿 NT$${MEMBERSHIP_RULES.giftMinSpend} 可使用）`,
          expiryDays: MEMBERSHIP_RULES.giftValidityDays,
        }),
      );

      await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          meta_data: [{ key: welcomeKey, value: "1" }],
        }),
      });

      return NextResponse.json({
        ok: true,
        already: false,
        coupon,
        message: `入會禮 NT$${amount} 領取成功！`,
      });
    }

    // birthday
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const regDate = new Date(user.date_created);
    if (
      regDate.getFullYear() === now.getFullYear() &&
      regDate.getMonth() + 1 === currentMonth
    ) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "依規定，當月壽星需於當月 1 日前完成註冊，方可領取本年度生日禮。",
        },
        { status: 400 },
      );
    }

    const metaKey = `${HOVER_MEMBERSHIP_META.birthdayClaimPrefix}${now.getFullYear()}_${currentMonth}`;
    if (meta.find((m) => m.key === metaKey && m.value === "1")) {
      return NextResponse.json({
        ok: true,
        already: true,
        message: "本月生日禮已領取過，請於結帳時使用。",
      });
    }

    const amount =
      membership?.birthdayCredit || MEMBERSHIP_RULES.birthdayFriends;
    const code = birthdayCouponCode(customerId, currentMonth);
    const coupon = await findOrCreateCoupon(
      authHeader,
      buildGiftCouponPayload({
        code,
        amount,
        email: customerEmail,
        description: `${tierLabel} 生日禮 NT$${amount}（單筆滿 NT$${MEMBERSHIP_RULES.giftMinSpend} 可使用）`,
        expiryDays: MEMBERSHIP_RULES.birthdayValidityDays,
      }),
    );

    await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
      method: "PUT",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ meta_data: [{ key: metaKey, value: "1" }] }),
    });

    return NextResponse.json({
      ok: true,
      already: false,
      coupon,
      message: `生日禮 NT$${amount} 領取成功！（限 ${MEMBERSHIP_RULES.birthdayValidityDays} 天內使用）`,
    });
  } catch (err) {
    console.error("claim coupon error:", err);
    return NextResponse.json(
      { ok: false, message: "系統錯誤" },
      { status: 500 },
    );
  }
}
