// src/app/api/account/coupons/available/route.ts
import { NextResponse } from "next/server";
import {
  couponKindFromCode,
  HOVER_MEMBERSHIP_META,
  HOVER_TIER,
  MEMBERSHIP_RULES,
  type MembershipPayload,
} from "@/lib/membership";
import {
  expiresAtFromClaimAt,
  isMasterCouponCode,
  MASTER_COUPONS,
  masterCouponKind,
  masterGiftValidityDays,
  resolveMasterCouponStatus,
} from "@/lib/masterCoupons";
import {
  birthdayClaimYearKey,
  birthdayUsedYearKey,
} from "@/lib/phoneGiftGuard";
import { getMemberSession } from "@/lib/memberSession";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BASE = (process.env.WC_API_BASE || "").replace(/\/$/, "");
const CK = process.env.WC_CONSUMER_KEY || "";
const CS = process.env.WC_CONSUMER_SECRET || "";

function basicAuth() {
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
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

function emailRestrictions(coupon: any): string[] {
  return Array.isArray(coupon?.email_restrictions)
    ? coupon.email_restrictions
        .map((e: any) => String(e).trim().toLowerCase())
        .filter(Boolean)
    : [];
}

function belongsToEmail(coupon: any, email: string) {
  const emails = emailRestrictions(coupon);
  if (!emails.length) return false;
  return emails.includes(email);
}

/** 公開活動券：無 email 限制（HOVER 優惠碼工作室／WP 自建活動碼） */
function isPublicPromoCoupon(coupon: any): boolean {
  if (emailRestrictions(coupon).length > 0) return false;
  const code = String(coupon?.code || "").toUpperCase();
  if (!code || isMasterCouponCode(code) || isLegacyGiftCode(code)) return false;
  const metaKind = String(
    (Array.isArray(coupon?.meta_data)
      ? coupon.meta_data.find((m: any) => m?.key === "hover_coupon_kind")?.value
      : "") || "",
  ).toLowerCase();
  if (metaKind === "promo" || metaKind === "vip") return true;
  if (code.startsWith("HOVER-PROMO-") || code.startsWith("HOVER-EXCL-")) {
    return true;
  }
  // WP 後台自建、無 email 綁定的活動碼（如「滿千折百」）
  return true;
}

function usedByCustomer(
  coupon: any,
  email: string,
  customerId: number,
): boolean {
  const usedBy = Array.isArray(coupon?.used_by) ? coupon.used_by : [];
  if (!usedBy.length) return false;
  const emailL = String(email || "")
    .trim()
    .toLowerCase();
  const idStr = String(customerId || "");
  return usedBy.some((u: any) => {
    const v = String(u || "")
      .trim()
      .toLowerCase();
    return (emailL && v === emailL) || (idStr && v === idStr);
  });
}

function resolveCouponKind(coupon: any): string {
  const metaKind = String(
    (Array.isArray(coupon?.meta_data)
      ? coupon.meta_data.find((m: any) => m?.key === "hover_coupon_kind")?.value
      : "") || "",
  ).toLowerCase();
  if (metaKind === "promo" || metaKind === "vip" || metaKind === "welcome" || metaKind === "birthday") {
    return metaKind;
  }
  const fromCode = couponKindFromCode(String(coupon?.code || ""));
  if (fromCode !== "other") return fromCode;
  // 公開無 email 限制 → 當活動優惠顯示
  if (emailRestrictions(coupon).length === 0) return "promo";
  return "other";
}

/**
 * 優惠券＝綁定會員（入會禮／生日禮等）
 * 優惠碼＝公開活動碼（無 email 限制，如 hover-promo-*、滿千折百）
 */
function resolveEntryType(
  coupon: any,
  force?: "coupon" | "code",
): { entryType: "coupon" | "code"; entryTypeLabel: string } {
  if (force === "coupon" || force === "code") {
    return {
      entryType: force,
      entryTypeLabel: force === "code" ? "優惠碼" : "優惠券",
    };
  }
  const isCode = isPublicPromoCoupon(coupon);
  return {
    entryType: isCode ? "code" : "coupon",
    entryTypeLabel: isCode ? "優惠碼" : "優惠券",
  };
}

function mapCoupon(
  coupon: any,
  statusOverride?: "usable" | "used" | "expired",
  entryTypeForce?: "coupon" | "code",
) {
  const kind = resolveCouponKind(coupon);
  const amount = Number(coupon.amount) || 0;
  const status = statusOverride || resolveStatus(coupon);
  const entry = resolveEntryType(coupon, entryTypeForce);
  return {
    kind,
    kindLabel: kindLabel(kind, amount),
    entryType: entry.entryType,
    entryTypeLabel: entry.entryTypeLabel,
    code: String(coupon.code || ""),
    amount,
    discountType: coupon.discount_type || "fixed_cart",
    description: coupon.description || "",
    minimumAmount: Number(coupon.minimum_amount || 0) || 0,
    productIds: Array.isArray(coupon.product_ids)
      ? coupon.product_ids.map((id: any) => Number(id)).filter(Boolean)
      : [],
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

function couponCreatedAt(coupon: any): string {
  const raw = String(
    coupon?.date_created_gmt || coupon?.date_created || "",
  ).trim();
  if (!raw) return "";
  const timestamp = Date.parse(raw);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : "";
}

function isLegacyGiftCode(code: string): boolean {
  return (
    /^HOVER100-\d+$/i.test(code) ||
    /^HOVER-WELCOME-/i.test(code) ||
    /^HOVER-BDAY-/i.test(code)
  );
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
  // 母券（入會／生日）一律為個人優惠券
  const mapped = mapCoupon({ ...base, code }, status, "coupon");
  if (expiresOverride) {
    mapped.expires = expiresOverride;
  }
  return mapped;
}

/** 僅用 customer meta 判斷臻享是否有效（免再打訂單／profile） */
function membershipFromMeta(meta: any[]): MembershipPayload {
  const expires = metaValue(meta, HOVER_MEMBERSHIP_META.exclusiveExpires);
  const exclusiveActive = Boolean(
    expires && new Date(expires).getTime() > Date.now(),
  );
  const tierId = exclusiveActive ? HOVER_TIER.EXCLUSIVE : HOVER_TIER.FRIENDS;
  return {
    tierId,
    tierName: tierId,
    tierLabel: exclusiveActive ? "臻享會員" : "品牌好友",
    tierLabelEn: exclusiveActive ? "HOVER EXCLUSIVE" : "HOVER FRIENDS",
    exclusiveActive,
    exclusiveSince: metaValue(meta, HOVER_MEMBERSHIP_META.exclusiveSince) || null,
    exclusiveExpires: expires || null,
    periodSpent:
      Number(metaValue(meta, HOVER_MEMBERSHIP_META.exclusivePeriodSpend) || 0) ||
      0,
    totalSpent12m: 0,
    discountRate: exclusiveActive ? 0.95 : 1,
    discountLabel: exclusiveActive ? "全年正價商品 95 折" : "無專屬折扣",
    nextTierName: null,
    nextTierLabel: null,
    nextNeedAmount: null,
    renewNeedAmount: null,
    birthdayCredit: exclusiveActive
      ? MEMBERSHIP_RULES.birthdayExclusive
      : MEMBERSHIP_RULES.birthdayFriends,
    welcomeGift: MEMBERSHIP_RULES.welcomeGift,
  };
}

export async function GET(req: Request) {
  try {
    if (!BASE || !CK || !CS) {
      return NextResponse.json({ ok: true, available: [], coupons: [] });
    }

    const { searchParams } = new URL(req.url);
    const subtotalAfterMember = Math.max(
      0,
      Number(searchParams.get("subtotalAfterMember") || 0) || 0,
    );
    const filterBySubtotal = Number.isFinite(
      Number(searchParams.get("subtotalAfterMember")),
    ) && searchParams.has("subtotalAfterMember");

    const member = await getMemberSession();
    if (!member?.email && !member?.customerId) {
      return NextResponse.json({ ok: true, available: [], coupons: [] });
    }

    const authHeader = { Authorization: basicAuth() };
    let customerId = Number(member.customerId || 0) || 0;
    let customerEmail = String(member.email || "")
      .trim()
      .toLowerCase();

    // 有 customerId 直接抓；否則用 email 查一次
    let user: any = null;
    if (customerId > 0) {
      const uRes = await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
        headers: authHeader,
        cache: "no-store",
      });
      if (uRes.ok) user = await uRes.json();
    }
    if (!user && customerEmail) {
      const cRes = await fetch(
        `${BASE}/wp-json/wc/v3/customers?email=${encodeURIComponent(customerEmail)}&role=all`,
        { headers: authHeader, cache: "no-store" },
      );
      if (cRes.ok) {
        const arr = await cRes.json();
        if (Array.isArray(arr) && arr[0]) {
          user = arr[0];
          customerId = Number(user.id) || 0;
        }
      }
    }

    if (!user || !customerId) {
      return NextResponse.json({ ok: true, available: [], coupons: [] });
    }

    if (!customerEmail) {
      customerEmail = String(user.email || "")
        .trim()
        .toLowerCase();
    }

    const meta: any[] = Array.isArray(user?.meta_data) ? [...user.meta_data] : [];
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const membership = membershipFromMeta(meta);
    const exclusiveActive = Boolean(membership.exclusiveActive);

    const needWelcomeLegacy =
      metaValue(meta, HOVER_MEMBERSHIP_META.welcomeClaimed) !== "1";
    const needBirthdayLegacy =
      metaValue(meta, `hover_birthday_claim_${year}_${month}`) !== "1" &&
      metaValue(meta, birthdayClaimYearKey(year)) !== "1";

    const masterCodes = [
      MASTER_COUPONS.welcome,
      exclusiveActive
        ? MASTER_COUPONS.birthdayExclusive
        : MASTER_COUPONS.birthdayFriends,
    ];

    // 平行：母券 + 近期券 +（必要時）舊制券
    const legacyCodes: string[] = [];
    if (needWelcomeLegacy) {
      legacyCodes.push(`HOVER100-${customerId}`, `UFFRD-${customerId}`);
    }
    if (needBirthdayLegacy) {
      legacyCodes.push(`HOVER-BDAY-${month}-${customerId}`);
    }

    const [masterWc, couponsRes, ...legacyResults] = await Promise.all([
      Promise.all(masterCodes.map((code) => fetchCouponByCode(code, authHeader))),
      fetch(
        `${BASE}/wp-json/wc/v3/coupons?per_page=100&orderby=date&order=desc`,
        { headers: authHeader, cache: "no-store" },
      ),
      ...legacyCodes.map((code) => fetchCouponByCode(code, authHeader)),
    ]);

    const migrationUpdates: Array<{ key: string; value: string }> = [];
    const addMigration = (key: string, value: string) => {
      if (!value || metaValue(meta, key)) return;
      meta.push({ key, value });
      migrationUpdates.push({ key, value });
    };

    let legacyIdx = 0;
    if (needWelcomeLegacy) {
      const legacyWelcome = legacyResults[legacyIdx++];
      const legacyUffrd = legacyResults[legacyIdx++];
      for (const legacy of [legacyWelcome, legacyUffrd]) {
        if (!legacy || !belongsToEmail(legacy, customerEmail)) continue;
        const claimedAt =
          metaValue(meta, "hover_welcome_claimed_at") ||
          couponCreatedAt(legacy);
        addMigration(HOVER_MEMBERSHIP_META.welcomeClaimed, "1");
        addMigration("hover_welcome_claimed_at", claimedAt);
        if (isUsed(legacy)) addMigration("hover_welcome_used", "1");
        break;
      }
    }
    if (needBirthdayLegacy) {
      const legacyBirthday = legacyResults[legacyIdx++];
      if (legacyBirthday && belongsToEmail(legacyBirthday, customerEmail)) {
        const claimedAt =
          metaValue(meta, `hover_birthday_claim_at_${year}_${month}`) ||
          couponCreatedAt(legacyBirthday);
        addMigration(`hover_birthday_claim_${year}_${month}`, "1");
        addMigration(birthdayClaimYearKey(year), "1");
        addMigration(`hover_birthday_claim_at_${year}_${month}`, claimedAt);
        if (isUsed(legacyBirthday)) {
          addMigration(`hover_birthday_used_${year}_${month}`, "1");
          addMigration(birthdayUsedYearKey(year), "1");
        }
      }
    }

    // 遷移寫入不擋回傳（背景處理）
    if (migrationUpdates.length) {
      void fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
        method: "PUT",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ meta_data: migrationUpdates }),
        cache: "no-store",
      }).catch(() => {});
    }

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

    const recent = couponsRes.ok ? await couponsRes.json() : [];
    for (const c of Array.isArray(recent) ? recent : []) {
      if (!c) continue;
      const key = String(c.code || "").toUpperCase();
      if (!key || byCode.has(key) || isMasterCouponCode(key)) continue;
      if (isLegacyGiftCode(key)) continue;

      const personal = belongsToEmail(c, customerEmail);
      const publicPromo = isPublicPromoCoupon(c);
      if (!personal && !publicPromo) continue;

      let status = resolveStatus(c);
      if (
        status === "usable" &&
        usedByCustomer(c, customerEmail, customerId)
      ) {
        status = "used";
      }
      byCode.set(key, mapCoupon(c, status));
    }

    const coupons = Array.from(byCode.values()).sort((a, b) => {
      const rank = (k: string) =>
        k === "welcome" || k === "legacy"
          ? 0
          : k === "birthday"
            ? 1
            : k === "promo"
              ? 2
              : k === "ref_friend"
                ? 3
                : 4;
      const statusRank = (s: string) =>
        s === "usable" ? 0 : s === "used" ? 1 : 2;
      const byStatus = statusRank(a.status) - statusRank(b.status);
      if (byStatus !== 0) return byStatus;
      return rank(a.kind) - rank(b.kind);
    });

    const available = coupons.filter((c) => {
      if (c.status !== "usable") return false;
      if (
        filterBySubtotal &&
        c.minimumAmount > 0 &&
        subtotalAfterMember < c.minimumAmount
      ) {
        return false;
      }
      return true;
    });

    return NextResponse.json({ ok: true, available, coupons });
  } catch (e) {
    console.error("available coupon error:", e);
    return NextResponse.json({ ok: true, available: [], coupons: [] });
  }
}
