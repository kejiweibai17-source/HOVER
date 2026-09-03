/**
 * 入會禮／生日禮 — 固定母券 + 會員 meta 自訂驗證
 * 母券：HOVER100 / HBDAY100 / VIPBDAY300（WooCommerce 各建一張，無 Email 限制）
 */
import {
  computeMembership,
  HOVER_MEMBERSHIP_META,
  HOVER_TIER,
  mapWcOrdersToLite,
  MEMBERSHIP_RULES,
  type MembershipPayload,
  type WcOrderLite,
} from "@/lib/membership";

export const MASTER_COUPONS = {
  welcome: "HOVER100",
  birthdayFriends: "HBDAY100",
  birthdayExclusive: "VIPBDAY300",
} as const;

export type MasterCouponKind = "welcome" | "birthday_friends" | "birthday_exclusive";

export type CustomerMetaRow = { key?: string; value?: unknown };

const META = {
  welcomeClaimedAt: "hover_welcome_claimed_at",
  welcomeUsed: "hover_welcome_used",
  birthdayClaimAtPrefix: "hover_birthday_claim_at_",
  birthdayUsedPrefix: "hover_birthday_used_",
} as const;

export function normalizeCouponCode(code: string): string {
  return String(code || "").trim().toUpperCase();
}

export function isMasterCouponCode(code: string): boolean {
  const c = normalizeCouponCode(code);
  return (
    c === MASTER_COUPONS.welcome ||
    c === MASTER_COUPONS.birthdayFriends ||
    c === MASTER_COUPONS.birthdayExclusive
  );
}

export function masterCouponKind(code: string): MasterCouponKind | null {
  const c = normalizeCouponCode(code);
  if (c === MASTER_COUPONS.welcome) return "welcome";
  if (c === MASTER_COUPONS.birthdayFriends) return "birthday_friends";
  if (c === MASTER_COUPONS.birthdayExclusive) return "birthday_exclusive";
  return null;
}

export function welcomeCouponCode(_customerId?: number | string): string {
  return MASTER_COUPONS.welcome;
}

export function birthdayCouponCode(
  _customerId?: number | string,
  _month?: number,
  exclusive = false,
): string {
  return exclusive
    ? MASTER_COUPONS.birthdayExclusive
    : MASTER_COUPONS.birthdayFriends;
}

export function birthdayCouponCodeForTier(exclusive: boolean): string {
  return birthdayCouponCode(undefined, undefined, exclusive);
}

function metaValue(
  meta: CustomerMetaRow[] | undefined,
  key: string,
): string {
  if (!Array.isArray(meta)) return "";
  const row = meta.find((m) => m.key === key);
  return row?.value != null ? String(row.value) : "";
}

function birthdayClaimKey(year: number, month: number): string {
  return `${HOVER_MEMBERSHIP_META.birthdayClaimPrefix}${year}_${month}`;
}

function birthdayClaimAtKey(year: number, month: number): string {
  return `${META.birthdayClaimAtPrefix}${year}_${month}`;
}

function birthdayUsedKey(year: number, month: number): string {
  return `${META.birthdayUsedPrefix}${year}_${month}`;
}

function parseBirthdayMonth(birthday: string): number | null {
  const m = String(birthday || "")
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const month = Number(m[2]);
  return month >= 1 && month <= 12 ? month : null;
}

function getBirthdayFromMeta(meta: CustomerMetaRow[]): string {
  return (
    metaValue(meta, "birthday") ||
    metaValue(meta, "billing_birth_date") ||
    metaValue(meta, "_billing_birth_date")
  );
}

function isWithinDays(iso: string, days: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  return Date.now() - t <= days * 24 * 60 * 60 * 1000;
}

/** 發放日起算 N 天後的到期時間（ISO） */
export function expiresAtFromClaimAt(
  claimedAt: string,
  days: number,
): string | null {
  const t = Date.parse(claimedAt);
  if (!Number.isFinite(t)) return null;
  return new Date(t + days * 24 * 60 * 60 * 1000).toISOString();
}

/** 入會禮／生日禮共用有效天數（發放日起算） */
export function masterGiftValidityDays(kind: MasterCouponKind): number {
  return kind === "welcome"
    ? MEMBERSHIP_RULES.giftValidityDays
    : MEMBERSHIP_RULES.birthdayValidityDays;
}

function masterCouponAmount(kind: MasterCouponKind): number {
  switch (kind) {
    case "welcome":
      return MEMBERSHIP_RULES.welcomeGift;
    case "birthday_friends":
      return MEMBERSHIP_RULES.birthdayFriends;
    case "birthday_exclusive":
      return MEMBERSHIP_RULES.birthdayExclusive;
  }
}

export type MasterCouponValidation = {
  valid: boolean;
  message: string;
  amount?: number;
  kind?: MasterCouponKind;
};

export function validateMasterCouponForMeta(
  code: string,
  meta: CustomerMetaRow[],
  membership: MembershipPayload | null,
  opts: { requireLogin?: boolean; loggedIn?: boolean } = {},
): MasterCouponValidation {
  const kind = masterCouponKind(code);
  if (!kind) {
    return { valid: false, message: "非固定母券折扣碼" };
  }

  if (opts.requireLogin !== false && !opts.loggedIn) {
    return { valid: false, message: "請先登入會員後再使用此折扣碼" };
  }

  const amount = masterCouponAmount(kind);
  const exclusiveActive = Boolean(
    membership?.tierId === HOVER_TIER.EXCLUSIVE && membership?.exclusiveActive,
  );

  if (kind === "welcome") {
    if (metaValue(meta, HOVER_MEMBERSHIP_META.welcomeClaimed) !== "1") {
      return { valid: false, message: "您尚未領取入會禮，請至會員中心領取" };
    }
    if (metaValue(meta, META.welcomeUsed) === "1") {
      return { valid: false, message: "入會禮折扣碼已使用過" };
    }
    const claimedAt = metaValue(meta, META.welcomeClaimedAt);
    // 必須有發放時間；沒有則視為未正確發放（舊資料請補寫 claimed_at）
    if (!claimedAt) {
      return {
        valid: false,
        message: "入會禮尚未完成發放，請至會員中心重新領取或聯繫客服",
      };
    }
    if (!isWithinDays(claimedAt, MEMBERSHIP_RULES.giftValidityDays)) {
      return { valid: false, message: "入會禮折扣碼已逾期（發放日起 30 天內有效）" };
    }
    return { valid: true, message: "", amount, kind };
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const birthMonth = parseBirthdayMonth(getBirthdayFromMeta(meta));

  if (!birthMonth) {
    return { valid: false, message: "請先設定生日後再使用生日禮折扣碼" };
  }
  if (birthMonth !== month) {
    return { valid: false, message: "生日禮折扣碼僅限生日當月使用" };
  }

  const claimKey = birthdayClaimKey(year, month);
  if (metaValue(meta, claimKey) !== "1") {
    return { valid: false, message: "您尚未領取本月生日禮，請至會員中心領取" };
  }

  const usedKey = birthdayUsedKey(year, month);
  if (metaValue(meta, usedKey) === "1") {
    return { valid: false, message: "本月生日禮折扣碼已使用過" };
  }

  const claimAt = metaValue(meta, birthdayClaimAtKey(year, month));
  if (!claimAt) {
    return {
      valid: false,
      message: "本月生日禮尚未完成發放，請至會員中心重新領取或聯繫客服",
    };
  }
  if (!isWithinDays(claimAt, MEMBERSHIP_RULES.birthdayValidityDays)) {
    return {
      valid: false,
      message: "本月生日禮折扣碼已逾期（發放日起 30 天內有效）",
    };
  }

  if (kind === "birthday_friends" && exclusiveActive) {
    return {
      valid: false,
      message: `臻享會員請使用 ${MASTER_COUPONS.birthdayExclusive}`,
    };
  }
  if (kind === "birthday_exclusive" && !exclusiveActive) {
    return {
      valid: false,
      message: `品牌好友請使用 ${MASTER_COUPONS.birthdayFriends}`,
    };
  }

  return { valid: true, message: "", amount, kind };
}

export type VirtualCouponStatus = "usable" | "used" | "expired";

export function resolveMasterCouponStatus(
  kind: MasterCouponKind,
  meta: CustomerMetaRow[],
  membership: MembershipPayload | null,
  year: number,
  month: number,
): VirtualCouponStatus {
  if (kind === "welcome") {
    if (metaValue(meta, HOVER_MEMBERSHIP_META.welcomeClaimed) !== "1") {
      return "expired";
    }
    if (metaValue(meta, META.welcomeUsed) === "1") return "used";
    const claimedAt = metaValue(meta, META.welcomeClaimedAt);
    if (!claimedAt) return "expired";
    if (!isWithinDays(claimedAt, MEMBERSHIP_RULES.giftValidityDays)) {
      return "expired";
    }
    return "usable";
  }

  const claimKey = birthdayClaimKey(year, month);
  if (metaValue(meta, claimKey) !== "1") return "expired";

  const usedKey = birthdayUsedKey(year, month);
  if (metaValue(meta, usedKey) === "1") return "used";

  const claimAt = metaValue(meta, birthdayClaimAtKey(year, month));
  if (!claimAt) return "expired";
  if (!isWithinDays(claimAt, MEMBERSHIP_RULES.birthdayValidityDays)) {
    return "expired";
  }

  const exclusiveActive = Boolean(
    membership?.tierId === HOVER_TIER.EXCLUSIVE && membership?.exclusiveActive,
  );
  if (kind === "birthday_friends" && exclusiveActive) return "expired";
  if (kind === "birthday_exclusive" && !exclusiveActive) return "expired";

  const birthMonth = parseBirthdayMonth(getBirthdayFromMeta(meta));
  if (birthMonth !== month) return "expired";

  return "usable";
}

export function buildMasterCouponMetaUpdates(
  code: string,
  meta: CustomerMetaRow[],
): { key: string; value: string }[] {
  const kind = masterCouponKind(code);
  if (!kind) return [];

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (kind === "welcome") {
    if (metaValue(meta, HOVER_MEMBERSHIP_META.welcomeClaimed) !== "1") {
      return [
        { key: HOVER_MEMBERSHIP_META.welcomeClaimed, value: "1" },
        { key: META.welcomeClaimedAt, value: now.toISOString() },
      ];
    }
    if (!metaValue(meta, META.welcomeClaimedAt)) {
      return [{ key: META.welcomeClaimedAt, value: now.toISOString() }];
    }
    return [];
  }

  const claimKey = birthdayClaimKey(year, month);
  const updates: { key: string; value: string }[] = [];
  if (metaValue(meta, claimKey) !== "1") {
    updates.push({ key: claimKey, value: "1" });
  }
  const atKey = birthdayClaimAtKey(year, month);
  if (!metaValue(meta, atKey)) {
    updates.push({ key: atKey, value: now.toISOString() });
  }
  return updates;
}

export function buildMasterCouponUsedMeta(code: string): { key: string; value: string }[] {
  const kind = masterCouponKind(code);
  if (!kind) return [];

  if (kind === "welcome") {
    return [{ key: META.welcomeUsed, value: "1" }];
  }

  const now = new Date();
  return [
    {
      key: birthdayUsedKey(now.getFullYear(), now.getMonth() + 1),
      value: "1",
    },
  ];
}

export async function fetchCustomerMembership(
  base: string,
  auth: string,
  customerId: number,
): Promise<{ meta: CustomerMetaRow[]; membership: MembershipPayload | null }> {
  try {
    const root = base.replace(/\/$/, "");
    const cRes = await fetch(`${root}/wp-json/wc/v3/customers/${customerId}`, {
      headers: { Authorization: auth },
      cache: "no-store",
    });
    if (!cRes.ok) return { meta: [], membership: null };
    const customer = await cRes.json();
    const meta: CustomerMetaRow[] = Array.isArray(customer?.meta_data)
      ? customer.meta_data
      : [];

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
    const oRes = await fetch(
      `${root}/wp-json/wc/v3/orders?customer=${customerId}&status=processing,completed&per_page=100&after=${encodeURIComponent(twelveMonthsAgo.toISOString())}`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const orders: WcOrderLite[] = oRes.ok
      ? mapWcOrdersToLite(await oRes.json())
      : [];
    const membership = computeMembership(
      orders,
      meta as { key: string; value: unknown }[],
    );
    return { meta, membership };
  } catch {
    return { meta: [], membership: null };
  }
}
