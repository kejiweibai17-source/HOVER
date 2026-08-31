/**
 * 生日禮補發 — 當月壽星於月中註冊／設定生日時自動發券
 * FRIENDS NT$100／臻享 NT$300（依 exclusive 效期）
 * 發券成功後寄純文字通知（先管理員，再會員）
 */
import nodemailer from "nodemailer";
import {
  buildGiftCouponPayload,
  birthdayCouponCode,
  HOVER_MEMBERSHIP_META,
  MEMBERSHIP_RULES,
} from "@/lib/membership";

const BASE = process.env.WC_API_BASE || "";
const CK = process.env.WC_CONSUMER_KEY || "";
const CS = process.env.WC_CONSUMER_SECRET || "";

/** 生日禮派發時同步通知的管理員信箱 */
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

/**
 * 純文字生日禮通知：先寄管理員，再寄會員。無 emoji。
 */
export async function sendBirthdayGiftNotifyMail(params: {
  customerEmail: string;
  month: number;
  code: string;
  amount: number;
  tierLabel: string;
}): Promise<void> {
  const customerEmail = String(params.customerEmail || "")
    .trim()
    .toLowerCase();
  if (!customerEmail) return;

  const transporter = createTransport();
  if (!transporter) {
    console.warn("[birthdayGift] SMTP 未設定，略過寄信");
    return;
  }

  const mailFrom = process.env.SMTP_USER!;
  const from = `"HOVER" <${mailFrom}>`;
  const amountLabel = Number(params.amount).toLocaleString("en-US");
  const minSpend = MEMBERSHIP_RULES.giftMinSpend.toLocaleString("en-US");
  const days = MEMBERSHIP_RULES.birthdayValidityDays;

  const adminSubject = "HOVER 生日禮派發通知";
  const adminBody = [
    "HOVER 生日禮派發通知",
    "",
    `會員 Email：${customerEmail}`,
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
      from,
      to,
      subject: adminSubject,
      text: adminBody,
    });
  }

  const memberSubject = "HOVER 生日禮通知";
  const memberBody = [
    "親愛的會員您好：",
    "",
    `您的 ${params.month} 月生日禮已發放，請至會員中心查看，或於結帳時使用以下折扣碼：`,
    "",
    `折扣碼：${params.code}`,
    `面額：NT$${amountLabel}`,
    `使用條件：單筆滿 NT$${minSpend}，限本人使用一次`,
    `有效期限：發放日起 ${days} 天內`,
    "",
    "祝您購物愉快",
    "HOVER",
  ].join("\n");

  await transporter.sendMail({
    from,
    to: customerEmail,
    subject: memberSubject,
    text: memberBody,
  });
}

export type BirthdayGiftResult = {
  granted: boolean;
  already: boolean;
  skipped: boolean;
  code: string;
  amount: number;
};

/**
 * 若生日月＝當月且尚未領過該年該月生日禮 → 建立折扣碼並標記已領。
 * 兩種會員皆補發：FRIENDS 100／臻享 300。發放成功會寄通知信。
 */
export async function grantBirthdayGiftIfEligible(params: {
  customerId: number;
  email: string;
  birthday: string;
  existingMeta?: Array<{ key?: string; value?: unknown }>;
}): Promise<BirthdayGiftResult> {
  const customerId = Number(params.customerId);
  const normalizedEmail = String(params.email || "").trim().toLowerCase();
  const birthMonth = parseBirthdayMonth(params.birthday);
  const now = new Date();
  const year = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const code = birthdayCouponCode(customerId, currentMonth);
  const empty: BirthdayGiftResult = {
    granted: false,
    already: false,
    skipped: true,
    code,
    amount: 0,
  };

  if (!hasWooConfig() || !customerId || !normalizedEmail || !birthMonth) {
    return empty;
  }
  if (birthMonth !== currentMonth) {
    return empty;
  }

  const claimKey = birthdayClaimKey(year, currentMonth);
  let meta = params.existingMeta;

  const headers = authHeaders();

  if (!meta) {
    const uRes = await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
      headers: { Authorization: basicAuth() },
      cache: "no-store",
    });
    if (uRes.ok) {
      const user = await uRes.json().catch(() => ({}));
      meta = Array.isArray(user?.meta_data) ? user.meta_data : [];
    } else {
      meta = [];
    }
  }

  if (metaValue(meta, claimKey) === "1") {
    return { granted: false, already: true, skipped: false, code, amount: 0 };
  }

  const exclusive = isExclusiveActive(
    metaValue(meta, HOVER_MEMBERSHIP_META.exclusiveExpires),
  );
  const amount = exclusive
    ? MEMBERSHIP_RULES.birthdayExclusive
    : MEMBERSHIP_RULES.birthdayFriends;
  const tierLabel = exclusive ? "臻享會員" : "品牌好友";

  const existRes = await fetch(
    `${BASE}/wp-json/wc/v3/coupons?code=${encodeURIComponent(code)}`,
    { headers: { Authorization: basicAuth() }, cache: "no-store" },
  );
  const existArr = await existRes.json().catch(() => []);
  const couponExists = Array.isArray(existArr) && existArr.length > 0;

  if (!couponExists) {
    const createRes = await fetch(`${BASE}/wp-json/wc/v3/coupons`, {
      method: "POST",
      headers,
      body: JSON.stringify(
        buildGiftCouponPayload({
          code,
          amount,
          email: normalizedEmail,
          description: `${tierLabel} 生日禮 NT$${amount}（單筆滿 NT$${MEMBERSHIP_RULES.giftMinSpend} 可使用，不可與其他優惠併用｜當月補發）`,
          expiryDays: MEMBERSHIP_RULES.birthdayValidityDays,
          kind: "birthday",
        }),
      ),
    });
    if (!createRes.ok) {
      const err = await createRes.text().catch(() => "");
      throw new Error(`create birthday coupon failed: ${err}`);
    }
  }

  await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      meta_data: [{ key: claimKey, value: "1" }],
    }),
  });

  try {
    await sendBirthdayGiftNotifyMail({
      customerEmail: normalizedEmail,
      month: currentMonth,
      code,
      amount,
      tierLabel,
    });
  } catch (e) {
    console.error("[birthdayGift] notify mail failed:", e);
  }

  return {
    granted: !couponExists,
    already: couponExists,
    skipped: false,
    code,
    amount,
  };
}
