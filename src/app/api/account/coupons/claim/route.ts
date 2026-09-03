// src/app/api/account/coupons/claim/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  birthdayCouponCodeForTier,
  buildMasterCouponMetaUpdates,
  expiresAtFromClaimAt,
  welcomeCouponCode,
} from "@/lib/masterCoupons";
import { sendBirthdayGiftNotifyMail } from "@/lib/birthdayGift";
import { MEMBERSHIP_RULES, HOVER_MEMBERSHIP_META } from "@/lib/membership";

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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const kind: "welcome" | "birthday" | "upgrade" = body.kind;

    const normalizedKind = kind === "upgrade" ? "welcome" : kind;

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
    const exclusiveActive = Boolean(membership?.exclusiveActive);

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
        // 舊資料可能缺 claimed_at → 補寫，從此刻起算 30 天
        const backfill = buildMasterCouponMetaUpdates(welcomeCouponCode(), meta);
        if (backfill.length) {
          await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
            method: "PUT",
            headers: { ...authHeader, "Content-Type": "application/json" },
            body: JSON.stringify({ meta_data: backfill }),
          });
        }
        return NextResponse.json({
          ok: true,
          already: true,
          message: "入會禮已領取過，請至優惠券查看。",
          coupon: { code: welcomeCouponCode() },
        });
      }

      const amount = membership?.welcomeGift || MEMBERSHIP_RULES.welcomeGift;
      const code = welcomeCouponCode();
      const updates = buildMasterCouponMetaUpdates(code, meta);

      await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ meta_data: updates }),
      });

      return NextResponse.json({
        ok: true,
        already: false,
        coupon: { code, amount },
        message: `入會禮 NT$${amount} 領取成功！結帳時請輸入 ${code}（限 ${MEMBERSHIP_RULES.giftValidityDays} 天內使用）`,
      });
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;

    const birthdayRaw =
      meta.find((m) => m.key === "birthday")?.value ||
      meta.find((m) => m.key === "billing_birth_date")?.value ||
      meta.find((m) => m.key === "_billing_birth_date")?.value ||
      "";
    const bdMatch = String(birthdayRaw)
      .trim()
      .match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!bdMatch) {
      return NextResponse.json(
        { ok: false, message: "請先設定生日後再領取生日禮" },
        { status: 400 },
      );
    }
    if (Number(bdMatch[2]) !== currentMonth) {
      return NextResponse.json(
        { ok: false, message: "生日禮僅限生日當月領取" },
        { status: 400 },
      );
    }

    const metaKey = `${HOVER_MEMBERSHIP_META.birthdayClaimPrefix}${now.getFullYear()}_${currentMonth}`;
    if (meta.find((m) => m.key === metaKey && m.value === "1")) {
      const code = birthdayCouponCodeForTier(exclusiveActive);
      const backfill = buildMasterCouponMetaUpdates(code, meta);
      if (backfill.length) {
        await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
          method: "PUT",
          headers: { ...authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({ meta_data: backfill }),
        });
      }
      return NextResponse.json({
        ok: true,
        already: true,
        message: "本月生日禮已領取過，請於結帳時使用。",
        coupon: { code },
      });
    }

    const amount =
      membership?.birthdayCredit || MEMBERSHIP_RULES.birthdayFriends;
    const code = birthdayCouponCodeForTier(exclusiveActive);
    const updates = buildMasterCouponMetaUpdates(code, meta);

    await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
      method: "PUT",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ meta_data: updates }),
    });

    try {
      const claimedAt = new Date().toISOString();
      await sendBirthdayGiftNotifyMail({
        customerEmail,
        month: currentMonth,
        code,
        amount,
        tierLabel,
        memberName:
          String(profile.customer?.first_name || "").trim() ||
          String(profile.customer?.name || "").trim() ||
          undefined,
        expiresAt: expiresAtFromClaimAt(
          claimedAt,
          MEMBERSHIP_RULES.birthdayValidityDays,
        ),
      });
    } catch (e) {
      console.error("birthday claim notify mail failed:", e);
    }

    return NextResponse.json({
      ok: true,
      already: false,
      coupon: { code, amount },
      message: `生日禮 NT$${amount} 領取成功！結帳時請輸入 ${code}（限 ${MEMBERSHIP_RULES.birthdayValidityDays} 天內使用）`,
    });
  } catch (err) {
    console.error("claim coupon error:", err);
    return NextResponse.json(
      { ok: false, message: "系統錯誤" },
      { status: 500 },
    );
  }
}
