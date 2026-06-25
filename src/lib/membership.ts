/**
 * HOVER 會員制度 — HOVER FRIENDS / HOVER EXCLUSIVE
 * 對齊 /membership 頁面規則
 */

export const HOVER_TIER = {
  FRIENDS: "HOVER_FRIENDS",
  EXCLUSIVE: "HOVER_EXCLUSIVE",
} as const;

export type HoverTierId =
  (typeof HOVER_TIER)[keyof typeof HOVER_TIER];

export const MEMBERSHIP_RULES = {
  /** 升級臻享：近 12 個月累積消費 */
  exclusiveUpgradeAmount: 10_000,
  /** 續會：臻享效期內累積消費 */
  exclusiveRenewAmount: 8_000,
  /** 臻享效期（月） */
  exclusiveValidityMonths: 12,
  welcomeGift: 100,
  birthdayFriends: 100,
  birthdayExclusive: 300,
  /** 購物金最低消費（單筆） */
  giftMinSpend: 1_000,
  /** 正價商品折扣 */
  exclusiveDiscountRate: 0.95,
  giftValidityDays: 90,
  birthdayValidityDays: 30,
} as const;

export type MembershipPayload = {
  tierId: HoverTierId;
  tierName: HoverTierId;
  tierLabel: string;
  tierLabelEn: string;
  totalSpent12m: number;
  periodSpent: number;
  discountLabel: string;
  discountRate: number;
  welcomeGift: number;
  birthdayCredit: number;
  exclusiveActive: boolean;
  exclusiveSince: string | null;
  exclusiveExpires: string | null;
  nextTierName: string | null;
  nextTierLabel: string | null;
  nextNeedAmount: number | null;
  renewNeedAmount: number | null;
};

export type WcOrderLite = {
  total: number;
  date_created: string;
};

export type CustomerMetaMap = Record<string, string>;

const META = {
  welcomeClaimed: "hover_welcome_claimed",
  birthdayClaimPrefix: "hover_birthday_claim_",
  exclusiveSince: "hover_exclusive_since",
  exclusiveExpires: "hover_exclusive_expires",
  exclusivePeriodSpend: "hover_exclusive_period_spend",
} as const;

export function tierLabel(tierId: HoverTierId): string {
  return tierId === HOVER_TIER.EXCLUSIVE ? "臻享會員" : "品牌好友";
}

export function tierLabelEn(tierId: HoverTierId): string {
  return tierId === HOVER_TIER.EXCLUSIVE ? "HOVER EXCLUSIVE" : "HOVER FRIENDS";
}

export function getDiscountRate(
  tierId: HoverTierId,
  exclusiveActive: boolean,
): number {
  if (tierId === HOVER_TIER.EXCLUSIVE && exclusiveActive) {
    return MEMBERSHIP_RULES.exclusiveDiscountRate;
  }
  return 1;
}

function parseMeta(meta: { key: string; value: unknown }[] = []): CustomerMetaMap {
  const map: CustomerMetaMap = {};
  for (const m of meta) {
    if (m?.key) map[m.key] = String(m.value ?? "");
  }
  return map;
}

function sumOrders(orders: WcOrderLite[]): number {
  return orders.reduce((s, o) => s + (parseFloat(String(o.total)) || 0), 0);
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString();
}

function isActiveExclusive(expiresIso: string | null | undefined): boolean {
  if (!expiresIso) return false;
  return new Date(expiresIso).getTime() > Date.now();
}

/** 依訂單與 customer meta 計算會員狀態（不寫入 WC） */
export function computeMembership(
  orders12m: WcOrderLite[],
  metaInput: { key: string; value: unknown }[] = [],
): MembershipPayload {
  const meta = parseMeta(metaInput);
  const totalSpent12m = sumOrders(orders12m);
  const now = new Date();

  let exclusiveSince = meta[META.exclusiveSince] || null;
  let exclusiveExpires = meta[META.exclusiveExpires] || null;
  let periodSpent = Number(meta[META.exclusivePeriodSpend] || 0) || 0;

  let exclusiveActive = isActiveExclusive(exclusiveExpires);

  // 效期內：累積期間消費（以訂單日期篩選）
  if (exclusiveSince && exclusiveExpires && exclusiveActive) {
    const since = new Date(exclusiveSince);
    const until = new Date(exclusiveExpires);
    periodSpent = sumOrders(
      orders12m.filter((o) => {
        const t = new Date(o.date_created).getTime();
        return t >= since.getTime() && t <= until.getTime();
      }),
    );
  }

  let tierId: HoverTierId = HOVER_TIER.FRIENDS;

  if (exclusiveActive) {
    tierId = HOVER_TIER.EXCLUSIVE;
  } else if (totalSpent12m >= MEMBERSHIP_RULES.exclusiveUpgradeAmount) {
    // 符合升級門檻但尚未寫入 meta — 視為臻享（profile sync 會補 meta）
    tierId = HOVER_TIER.EXCLUSIVE;
    exclusiveActive = true;
    if (!exclusiveSince) exclusiveSince = isoDate(now);
    if (!exclusiveExpires) {
      exclusiveExpires = isoDate(
        addMonths(new Date(exclusiveSince), MEMBERSHIP_RULES.exclusiveValidityMonths),
      );
    }
  }

  const discountRate = getDiscountRate(tierId, exclusiveActive);
  const discountLabel =
    tierId === HOVER_TIER.EXCLUSIVE && exclusiveActive
      ? "全年正價商品 95 折"
      : "無專屬折扣";

  let nextTierName: string | null = null;
  let nextTierLabel: string | null = null;
  let nextNeedAmount: number | null = null;
  let renewNeedAmount: number | null = null;

  if (tierId === HOVER_TIER.FRIENDS) {
    nextTierName = HOVER_TIER.EXCLUSIVE;
    nextTierLabel = tierLabel(HOVER_TIER.EXCLUSIVE);
    nextNeedAmount = Math.max(
      0,
      MEMBERSHIP_RULES.exclusiveUpgradeAmount - totalSpent12m,
    );
  } else if (exclusiveActive) {
    renewNeedAmount = Math.max(
      0,
      MEMBERSHIP_RULES.exclusiveRenewAmount - periodSpent,
    );
  }

  const birthdayCredit =
    tierId === HOVER_TIER.EXCLUSIVE && exclusiveActive
      ? MEMBERSHIP_RULES.birthdayExclusive
      : MEMBERSHIP_RULES.birthdayFriends;

  return {
    tierId,
    tierName: tierId,
    tierLabel: tierLabel(tierId),
    tierLabelEn: tierLabelEn(tierId),
    totalSpent12m,
    periodSpent,
    discountLabel,
    discountRate,
    welcomeGift: MEMBERSHIP_RULES.welcomeGift,
    birthdayCredit,
    exclusiveActive,
    exclusiveSince,
    exclusiveExpires,
    nextTierName,
    nextTierLabel,
    nextNeedAmount,
    renewNeedAmount,
  };
}

export function buildExclusiveMetaUpdates(
  orders12m: WcOrderLite[],
  metaInput: { key: string; value: unknown }[] = [],
): { key: string; value: string }[] {
  const meta = parseMeta(metaInput);
  const totalSpent12m = sumOrders(orders12m);
  const now = new Date();
  const updates: { key: string; value: string }[] = [];

  let exclusiveSince = meta[META.exclusiveSince] || "";
  let exclusiveExpires = meta[META.exclusiveExpires] || "";
  const active = isActiveExclusive(exclusiveExpires);

  if (!active && totalSpent12m >= MEMBERSHIP_RULES.exclusiveUpgradeAmount) {
    exclusiveSince = isoDate(now);
    exclusiveExpires = isoDate(
      addMonths(now, MEMBERSHIP_RULES.exclusiveValidityMonths),
    );
    updates.push(
      { key: META.exclusiveSince, value: exclusiveSince },
      { key: META.exclusiveExpires, value: exclusiveExpires },
      { key: META.exclusivePeriodSpend, value: "0" },
    );
    return updates;
  }

  if (active && exclusiveSince && exclusiveExpires) {
    const since = new Date(exclusiveSince);
    const until = new Date(exclusiveExpires);
    const periodSpent = sumOrders(
      orders12m.filter((o) => {
        const t = new Date(o.date_created).getTime();
        return t >= since.getTime() && t <= until.getTime();
      }),
    );

    if (periodSpent >= MEMBERSHIP_RULES.exclusiveRenewAmount) {
      const newExpires = addMonths(until, MEMBERSHIP_RULES.exclusiveValidityMonths);
      updates.push(
        { key: META.exclusiveExpires, value: isoDate(newExpires) },
        { key: META.exclusivePeriodSpend, value: "0" },
      );
    } else {
      updates.push({ key: META.exclusivePeriodSpend, value: String(Math.round(periodSpent)) });
    }
  }

  return updates;
}

export function couponKindFromCode(code: string): string {
  const c = String(code || "").toUpperCase();
  if (c.startsWith("HOVER-WELCOME-")) return "welcome";
  if (c.startsWith("HOVER-BDAY-")) return "birthday";
  if (c.startsWith("HOVER-PROMO-")) return "promo";
  if (c.startsWith("UFFRD-")) return "ref_friend";
  if (c.startsWith("UFAMB-")) return "ref_ambassador";
  if (c.startsWith("UFUP-") || c.startsWith("UFBD-")) return "legacy";
  return "other";
}

export function welcomeCouponCode(customerId: number | string): string {
  return `HOVER-WELCOME-${customerId}`;
}

export function birthdayCouponCode(
  customerId: number | string,
  month: number,
): string {
  return `HOVER-BDAY-${month}-${customerId}`;
}

export function buildGiftCouponPayload(opts: {
  code: string;
  amount: number;
  email: string;
  description: string;
  expiryDays: number;
}) {
  const expires = new Date();
  expires.setDate(expires.getDate() + opts.expiryDays);
  return {
    code: opts.code,
    discount_type: "fixed_cart" as const,
    amount: String(opts.amount),
    usage_limit: 1,
    usage_limit_per_user: 1,
    email_restrictions: [opts.email.toLowerCase()],
    minimum_amount: String(MEMBERSHIP_RULES.giftMinSpend),
    description: opts.description,
    date_expires: expires.toISOString(),
    meta_data: [{ key: "hover_coupon_kind", value: "membership_gift" }],
  };
}

export function calcMemberDiscountAmount(
  subtotal: number,
  tierId: HoverTierId,
  exclusiveActive: boolean,
): number {
  const rate = getDiscountRate(tierId, exclusiveActive);
  if (rate >= 1 || subtotal <= 0) return 0;
  return Math.round(subtotal * (1 - rate));
}

export { META as HOVER_MEMBERSHIP_META };
