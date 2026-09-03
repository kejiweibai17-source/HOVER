/**
 * 會員禮信件（入會禮／品牌好友生日禮／臻享生日禮）
 * 程式端寄送，不走 WooCommerce 後台文案
 */
import nodemailer from "nodemailer";
import { MEMBERSHIP_RULES } from "@/lib/membership";
import {
  expiresAtFromClaimAt,
  MASTER_COUPONS,
} from "@/lib/masterCoupons";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXTAUTH_URL ||
  "https://hoverofficial.com"
).replace(/\/$/, "");

const LINE_URL = "https://lin.ee/uKRvV64";
const GREEN = "#2a514d";

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

function money(n: number): string {
  return `NT$${Number(n).toLocaleString("en-US")}`;
}

function formatExpiry(iso: string | null | undefined): string {
  if (!iso) {
    const d = new Date();
    d.setDate(d.getDate() + MEMBERSHIP_RULES.giftValidityDays);
    return formatDateTw(d);
  }
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "發放日起 30 天內";
  return formatDateTw(new Date(t));
}

function formatDateTw(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}/${m}/${day}`;
}

function displayName(name?: string | null, email?: string | null): string {
  const n = String(name || "").trim();
  if (n) return n;
  const e = String(email || "").trim();
  if (e.includes("@")) return e.split("@")[0] || "會員";
  return "會員";
}

function shell(inner: string): string {
  return `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f6f6f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f6f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;padding:32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111;">
        <tr><td>
          <div style="font-size:28px;letter-spacing:0.2em;font-weight:700;margin-bottom:28px;">HOVER</div>
          ${inner}
          <div style="margin-top:36px;padding-top:20px;border-top:1px solid #ddd;font-size:12px;line-height:1.8;color:#777;">
            <p style="margin:0;">此為系統自動發送信件，請勿直接回覆。</p>
            <p style="margin:8px 0 0;">
              HOVER 官方網站｜<a href="${SITE_URL}" style="color:${GREEN};text-decoration:underline;">hoverofficial.com</a><br />
              客服聯繫｜<a href="${LINE_URL}" style="color:${GREEN};text-decoration:underline;">HOVER 官方 LINE</a>
            </p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function giftBlock(opts: {
  title: string;
  code: string;
  amount: number;
  usageLimit: string;
  expiresLabel: string;
}): string {
  const min = money(MEMBERSHIP_RULES.giftMinSpend);
  return `
    <h2 style="margin:28px 0 12px;font-size:15px;letter-spacing:0.08em;color:${GREEN};font-weight:700;">${opts.title}</h2>
    <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#333;">折扣碼</td>
        <td style="padding:6px 0;font-size:14px;color:#111;text-align:right;font-weight:700;letter-spacing:0.06em;">${opts.code}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#333;">折抵金額</td>
        <td style="padding:6px 0;font-size:14px;color:#111;text-align:right;">${money(opts.amount)}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#333;">使用門檻</td>
        <td style="padding:6px 0;font-size:14px;color:#111;text-align:right;">單筆訂單滿 ${min}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#333;">使用次數</td>
        <td style="padding:6px 0;font-size:14px;color:#111;text-align:right;">${opts.usageLimit}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#333;">使用期限</td>
        <td style="padding:6px 0;font-size:14px;color:#111;text-align:right;">${opts.expiresLabel}</td>
      </tr>
    </table>
    <p style="margin:24px 0 0;">
      <a href="${SITE_URL}" style="color:${GREEN};font-weight:700;text-decoration:underline;font-size:14px;">探索 HOVER</a>
    </p>
  `;
}

export function buildWelcomeGiftMailHtml(params: {
  memberName?: string;
  email?: string;
  expiresAt?: string | null;
}): { subject: string; html: string } {
  const name = displayName(params.memberName, params.email);
  const expiresLabel = formatExpiry(
    params.expiresAt ||
      expiresAtFromClaimAt(new Date().toISOString(), MEMBERSHIP_RULES.giftValidityDays),
  );
  const html = shell(`
    <p style="margin:0 0 12px;font-size:15px;line-height:1.8;">親愛的${name}，</p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">歡迎加入 HOVER FRIENDS 品牌好友。</p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">感謝您的加入，我們為您準備了 ${money(MEMBERSHIP_RULES.welcomeGift)} 入會禮購物金。</p>
    <div style="height:16px;line-height:16px;font-size:16px;">&nbsp;</div>
    ${giftBlock({
      title: "入會禮購物金",
      code: MASTER_COUPONS.welcome,
      amount: MEMBERSHIP_RULES.welcomeGift,
      usageLimit: "每位會員限用一次",
      expiresLabel,
    })}
  `);
  return { subject: "歡迎加入 HOVER FRIENDS", html };
}

export function buildBirthdayGiftMailHtml(params: {
  memberName?: string;
  email?: string;
  exclusive: boolean;
  expiresAt?: string | null;
}): { subject: string; html: string } {
  const name = displayName(params.memberName, params.email);
  const exclusive = Boolean(params.exclusive);
  const amount = exclusive
    ? MEMBERSHIP_RULES.birthdayExclusive
    : MEMBERSHIP_RULES.birthdayFriends;
  const code = exclusive
    ? MASTER_COUPONS.birthdayExclusive
    : MASTER_COUPONS.birthdayFriends;
  const title = exclusive ? "臻享會員生日禮" : "品牌好友生日禮";
  const subject = exclusive
    ? "生日快樂！HOVER 臻享生日禮送給您"
    : "生日快樂！HOVER 送您一份生日禮";
  const expiresLabel = formatExpiry(
    params.expiresAt ||
      expiresAtFromClaimAt(
        new Date().toISOString(),
        MEMBERSHIP_RULES.birthdayValidityDays,
      ),
  );

  const html = shell(`
    <p style="margin:0 0 12px;font-size:15px;line-height:1.8;">親愛的${name}，</p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">生日快樂！</p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">感謝您一直以來對 HOVER 的支持，我們為您的生日準備了 ${money(amount)} ${exclusive ? "臻享生日禮" : "生日禮"}購物金。</p>
    <div style="height:16px;line-height:16px;font-size:16px;">&nbsp;</div>
    ${giftBlock({
      title,
      code,
      amount,
      usageLimit: "每位會員每年度限用一次",
      expiresLabel,
    })}
  `);
  return { subject, html };
}

async function sendHtmlMail(to: string, subject: string, html: string) {
  const transporter = createTransport();
  if (!transporter) {
    console.warn("[membershipGiftMails] SMTP 未設定，略過寄信");
    return false;
  }
  const mailFrom = process.env.SMTP_USER!;
  await transporter.sendMail({
    from: `"HOVER" <${mailFrom}>`,
    to,
    subject,
    html,
  });
  return true;
}

export async function sendWelcomeGiftMail(params: {
  customerEmail: string;
  memberName?: string;
  expiresAt?: string | null;
}): Promise<void> {
  const to = String(params.customerEmail || "").trim().toLowerCase();
  if (!to) return;
  const { subject, html } = buildWelcomeGiftMailHtml({
    memberName: params.memberName,
    email: to,
    expiresAt: params.expiresAt,
  });
  await sendHtmlMail(to, subject, html);
}

export async function sendMemberBirthdayGiftMail(params: {
  customerEmail: string;
  memberName?: string;
  exclusive: boolean;
  expiresAt?: string | null;
}): Promise<void> {
  const to = String(params.customerEmail || "").trim().toLowerCase();
  if (!to) return;
  const { subject, html } = buildBirthdayGiftMailHtml({
    memberName: params.memberName,
    email: to,
    exclusive: params.exclusive,
    expiresAt: params.expiresAt,
  });
  await sendHtmlMail(to, subject, html);
}
