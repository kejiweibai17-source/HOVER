/**
 * 生日禮 — 固定母券 HBDAY100 / VIPBDAY300 + meta 標記已領
 */
import nodemailer from "nodemailer";
import {
  HOVER_MEMBERSHIP_META,
  MEMBERSHIP_RULES,
} from "@/lib/membership";
import {
  birthdayCouponCodeForTier,
  buildMasterCouponMetaUpdates,
  expiresAtFromClaimAt,
} from "@/lib/masterCoupons";
import { sendMemberBirthdayGiftMail } from "@/lib/membershipGiftMails";
import {
  birthdayClaimYearKey,
  metaHasBirthdayYearClaim,
  phoneHasBirthdayGiftYear,
  resolveCustomerPhone,
} from "@/lib/phoneGiftGuard";
import { isValidTwMobile } from "@/lib/socialLink";

const BASE = process.env.WC_API_BASE || "";
const CK = process.env.WC_CONSUMER_KEY || "";
const CS = process.env.WC_CONSUMER_SECRET || "";

const BIRTHDAY_ADMIN_NOTIFY = [
  "service@hoverofficial.com",
  "bob112722761236tom@gmail.com",
] as const;

function hasWooConfig() {
  return Boolean(BASE && CK && CS);
}

function basicAuth() {
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

function authHeaders() {
  return {
    Authorization: basicAuth(),
    "Content-Type": "application/json",
  };
}

function metaValue(
  meta: Array<{ key?: string; value?: unknown }> | undefined,
  key: string,
): string {
  if (!Array.isArray(meta)) return "";
  const row = meta.find((m) => m.key === key);
  return row?.value != null ? String(row.value) : "";
}

function birthdayClaimKey(year: number, month: number): string {
  return `${HOVER_MEMBERSHIP_META.birthdayClaimPrefix}${year}_${month}`;
}

function parseBirthdayMonth(birthday: string): number | null {
  const m = String(birthday || "")
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const month = Number(m[2]);
  return month >= 1 && month <= 12 ? month : null;
}

function isExclusiveActive(expires: string): boolean {
  if (!expires) return false;
  const t = Date.parse(expires);
  return Number.isFinite(t) && t > Date.now();
}

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function notifyAdmins(params: {
  customerEmail: string;
  month: number;
  code: string;
  amount: number;
  tierLabel: string;
}) {
  const transporter = createTransport();
  if (!transporter) return;

  const mailFrom = process.env.SMTP_USER!;
  const amountLabel = Number(params.amount).toLocaleString("en-US");
  const minSpend = MEMBERSHIP_RULES.giftMinSpend.toLocaleString("en-US");
  const days = MEMBERSHIP_RULES.birthdayValidityDays;
  const body = [
    "HOVER 生日禮派發通知",
    "",
    `會員 Email：${params.customerEmail}`,
    `會員等級：${params.tierLabel}`,
    `生日月份：${params.month} 月`,
    `折扣碼：${params.code}`,
    `面額：NT$${amountLabel}`,
    `使用條件：單筆滿 NT$${minSpend}，限本人一次，${days} 天內有效`,
    "",
    "此為系統自動通知。",
    "HOVER",
  ].join("\n");

  for (const to of BIRTHDAY_ADMIN_NOTIFY) {
    await transporter.sendMail({
      from: `"HOVER" <${mailFrom}>`,
      to,
      subject: "HOVER 生日禮派發通知",
      text: body,
    });
  }
}

/**
 * 會員生日禮通知（HTML 範本）＋管理員純文字通知
 */
export async function sendBirthdayGiftNotifyMail(params: {
  customerEmail: string;
  month: number;
  code: string;
  amount: number;
  tierLabel: string;
  memberName?: string;
  expiresAt?: string | null;
}): Promise<void> {
  const customerEmail = String(params.customerEmail || "")
    .trim()
    .toLowerCase();
  if (!customerEmail) return;

  const exclusive =
    params.amount >= MEMBERSHIP_RULES.birthdayExclusive ||
    /臻享|EXCLUSIVE/i.test(params.tierLabel);

  try {
    await notifyAdmins(params);
  } catch (e) {
    console.error("[birthdayGift] admin notify failed:", e);
  }

  await sendMemberBirthdayGiftMail({
    customerEmail,
    memberName: params.memberName,
    exclusive,
    expiresAt: params.expiresAt,
  });
}

export type BirthdayGiftResult = {
  granted: boolean;
  already: boolean;
  skipped: boolean;
  code: string;
  amount: number;
};

export async function grantBirthdayGiftIfEligible(params: {
  customerId: number;
  email: string;
  birthday: string;
  existingMeta?: Array<{ key?: string; value?: unknown }>;
  memberName?: string;
}): Promise<BirthdayGiftResult> {
  const customerId = Number(params.customerId);
  const normalizedEmail = String(params.email || "").trim().toLowerCase();
  const birthMonth = parseBirthdayMonth(params.birthday);
  const now = new Date();
  const year = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const empty: BirthdayGiftResult = {
    granted: false,
    already: false,
    skipped: true,
    code: birthdayCouponCodeForTier(false),
    amount: 0,
  };

  if (!hasWooConfig() || !customerId || !normalizedEmail || !birthMonth) {
    return empty;
  }
  if (birthMonth !== currentMonth) {
    return empty;
  }

  const claimKey = birthdayClaimKey(year, currentMonth);
  const yearKey = birthdayClaimYearKey(year);
  let meta = params.existingMeta;
  const headers = authHeaders();
  let customerPhone = "";

  if (!meta) {
    const uRes = await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
      headers: { Authorization: basicAuth() },
      cache: "no-store",
    });
    if (uRes.ok) {
      const user = await uRes.json().catch(() => ({}));
      meta = Array.isArray(user?.meta_data) ? user.meta_data : [];
      customerPhone = await resolveCustomerPhone(customerId, user);
      if (!params.memberName) {
        const fn = String(user?.first_name || "").trim();
        const ln = String(user?.last_name || "").trim();
        params.memberName = `${fn} ${ln}`.trim() || undefined;
      }
    } else {
      meta = [];
    }
  } else {
    customerPhone = await resolveCustomerPhone(customerId, {
      meta_data: meta,
    });
  }

  const exclusive = isExclusiveActive(
    metaValue(meta, HOVER_MEMBERSHIP_META.exclusiveExpires),
  );
  const amount = exclusive
    ? MEMBERSHIP_RULES.birthdayExclusive
    : MEMBERSHIP_RULES.birthdayFriends;
  const code = birthdayCouponCodeForTier(exclusive);
  const tierLabel = exclusive ? "臻享會員" : "品牌好友";

  if (
    metaHasBirthdayYearClaim(meta, year) ||
    metaValue(meta, claimKey) === "1"
  ) {
    return { granted: false, already: true, skipped: false, code, amount };
  }

  if (!isValidTwMobile(customerPhone)) {
    return { granted: false, already: false, skipped: true, code, amount };
  }

  if (await phoneHasBirthdayGiftYear(customerPhone, year, customerId)) {
    return { granted: false, already: true, skipped: false, code, amount };
  }

  const claimedAt = now.toISOString();
  const updates = buildMasterCouponMetaUpdates(code, meta || []);
  // 年度限一次（跨好友／臻享）
  if (!updates.some((u) => u.key === yearKey)) {
    updates.push({ key: yearKey, value: "1" });
  }
  await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ meta_data: updates }),
  });

  const expiresAt = expiresAtFromClaimAt(
    claimedAt,
    MEMBERSHIP_RULES.birthdayValidityDays,
  );

  try {
    await sendBirthdayGiftNotifyMail({
      customerEmail: normalizedEmail,
      month: currentMonth,
      code,
      amount,
      tierLabel,
      memberName: params.memberName,
      expiresAt,
    });
  } catch (e) {
    console.error("[birthdayGift] notify mail failed:", e);
  }

  return {
    granted: true,
    already: false,
    skipped: false,
    code,
    amount,
  };
}
