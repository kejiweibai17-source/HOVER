// src/app/api/account/coupons/available/route.ts
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import {
  couponKindFromCode,
  MEMBERSHIP_RULES,
} from "@/lib/membership";
import {
  expiresAtFromClaimAt,
  isMasterCouponCode,
  MASTER_COUPONS,
  masterCouponKind,
  masterGiftValidityDays,
  resolveMasterCouponStatus,
} from "@/lib/masterCoupons";

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

function isUsed(coupon: any) {
  const usageCount = Number(coupon?.usage_count ?? 0) || 0;
  const usageLimit = Number(coupon?.usage_limit ?? 0) || 0;
  if (usageLimit > 0 && usageCount >= usageLimit) return true;
  const perUser = Number(coupon?.usage_limit_per_user ?? 0) || 0;
  if (perUser > 0 && usageCount >= perUser) return true;
  return usageCount > 0 && usageLimit === 1;
}

function resolveStatus(coupon: any): "usable" | "used" | "expired" {
  if (isExpired(coupon)) return "expired";
  if (isUsed(coupon)) return "used";
  return "usable";
}

function kindLabel(kind: string, amount: number) {
  switch (kind) {
    case "welcome":
    case "legacy":
      return "入會禮";
    case "birthday":
      return amount >= MEMBERSHIP_RULES.birthdayExclusive
        ? "臻享會員生日禮"
        : "品牌好友生日禮";
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

function mapCoupon(coupon: any, statusOverride?: "usable" | "used" | "expired") {
  const code = String(coupon.code || "").toUpperCase();
  const kind = couponKindFromCode(code);
  const amount = Number(coupon.amount) || 0;
  const status = statusOverride || resolveStatus(coupon);
  return {
    kind,
    kindLabel: kindLabel(kind, amount),
    code,
    amount,
    discountType: coupon.discount_type || "fixed_cart",
    description: coupon.description || "",
    minimumAmount: Number(coupon.minimum_amount || 0) || 0,
    expires: coupon.date_expires || coupon.date_expires_gmt || null,
    status,
    statusLabel:
      status === "usable" ? "可使用" : status === "used" ? "已使用" : "已過期",
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

function metaValue(meta: any[], key: string): string {
  const row = meta.find((m) => m.key === key);
  return row?.value != null ? String(row.value) : "";
}

function buildVirtualMasterCoupon(
  wcCoupon: any,
  code: string,
  status: "usable" | "used" | "expired",
  expiresOverride: string | null = null,
) {
  const base = wcCoupon || {
    code,
    discount_type: "fixed_cart",
    amount:
      code === MASTER_COUPONS.birthdayExclusive
        ? MEMBERSHIP_RULES.birthdayExclusive
        : code === MASTER_COUPONS.birthdayFriends
          ? MEMBERSHIP_RULES.birthdayFriends
          : MEMBERSHIP_RULES.welcomeGift,
    minimum_amount: MEMBERSHIP_RULES.giftMinSpend,
    description: "",
  };
  const mapped = mapCoupon({ ...base, code }, status);
  if (expiresOverride) {
    mapped.expires = expiresOverride;
  }
  return mapped;
}

export async function GET() {
  try {
    const profile = await fetchProfileWithSameCookies();
    if (!profile?.loggedIn || !profile?.customer?.id) {
      return NextResponse.json({ ok: true, available: [], coupons: [] });
    }

    const customerId = profile.customer.id;
    const customerEmail = String(profile.customer.email || "")
      .trim()
      .toLowerCase();
    const membership = profile.membership;
    const authHeader = { Authorization: basicAuth() };

    const uRes = await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
      headers: authHeader,
      cache: "no-store",
    });
    const user = uRes.ok ? await uRes.json() : { meta_data: [] };
    const meta: any[] = Array.isArray(user?.meta_data) ? user.meta_data : [];

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const exclusiveActive = Boolean(membership?.exclusiveActive);

    const masterCodes = [
      MASTER_COUPONS.welcome,
      exclusiveActive
        ? MASTER_COUPONS.birthdayExclusive
        : MASTER_COUPONS.birthdayFriends,
    ];

    const masterWc = await Promise.all(
      masterCodes.map((code) => fetchCouponByCode(code, authHeader)),
    );

    const byCode = new Map<string, ReturnType<typeof mapCoupon>>();

    for (let i = 0; i < masterCodes.length; i++) {
      const code = masterCodes[i];
      const kind = masterCouponKind(code);
      if (!kind) continue;

      const status = resolveMasterCouponStatus(
        kind,
        meta,
        membership,
        year,
        month,
      );

      const claimed =
        kind === "welcome"
          ? metaValue(meta, "hover_welcome_claimed") === "1"
          : metaValue(meta, `hover_birthday_claim_${year}_${month}`) === "1";

      if (!claimed && status === "expired") continue;

      const claimAt =
        kind === "welcome"
          ? metaValue(meta, "hover_welcome_claimed_at")
          : metaValue(meta, `hover_birthday_claim_at_${year}_${month}`);
      const expiresOverride = claimAt
        ? expiresAtFromClaimAt(claimAt, masterGiftValidityDays(kind))
        : null;

      byCode.set(
        code,
        buildVirtualMasterCoupon(masterWc[i], code, status, expiresOverride),
      );
    }

    // 舊版每人專屬券（HOVER100-123、HOVER-BDAY-…）仍顯示
    const legacyCodes = [
      `HOVER100-${customerId}`,
      `UFFRD-${customerId}`,
      ...Array.from({ length: 12 }, (_, i) =>
        `HOVER-BDAY-${i + 1}-${customerId}`,
      ),
    ];
    const legacyResults = await Promise.all(
      legacyCodes.map((code) => fetchCouponByCode(code, authHeader)),
    );

    const couponsRes = await fetch(
      `${BASE}/wp-json/wc/v3/coupons?per_page=100&orderby=date&order=desc`,
      { headers: authHeader, cache: "no-store" },
    );
    const recent = couponsRes.ok ? await couponsRes.json() : [];

    for (const c of [...legacyResults, ...(Array.isArray(recent) ? recent : [])]) {
      if (!c) continue;
      const key = String(c.code || "").toUpperCase();
      if (!key || byCode.has(key) || isMasterCouponCode(key)) continue;
      if (!belongsToEmail(c, customerEmail)) continue;
      byCode.set(key, mapCoupon(c));
    }

    const coupons = Array.from(byCode.values()).sort((a, b) => {
      const rank = (k: string) =>
        k === "welcome" || k === "legacy"
          ? 0
          : k === "birthday"
            ? 1
            : k === "ref_friend"
              ? 2
              : 3;
      const statusRank = (s: string) =>
        s === "usable" ? 0 : s === "used" ? 1 : 2;
      const byStatus = statusRank(a.status) - statusRank(b.status);
      if (byStatus !== 0) return byStatus;
      return rank(a.kind) - rank(b.kind);
    });

    const available = coupons.filter((c) => c.status === "usable");

    return NextResponse.json({ ok: true, available, coupons });
  } catch (e) {
    console.error("available coupon error:", e);
    return NextResponse.json({ ok: true, available: [], coupons: [] });
  }
}
