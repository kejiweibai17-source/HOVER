/**
 * 會員禮信件（入會禮／品牌好友生日禮／臻享生日禮）
 * 程式端寄送，不走 WooCommerce 後台文案
 *
 * 送達優化：HTML + 純文字、List-Unsubscribe、主旨偏「會員通知」語氣
 */
import nodemailer from "nodemailer";
import { MEMBERSHIP_RULES } from "@/lib/membership";
import {
  expiresAtFromClaimAt,
  MASTER_COUPONS,
} from "@/lib/masterCoupons";
import {
  mailFooterText,
  mailFromHeader,
  mailReplyTo,
  mailShellHtml,
} from "@/lib/mailFrom";
import {
  HOVER_SITE_URL,
  HOVER_SUPPORT_EMAIL,
} from "@/lib/hoverContact";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.NEXTAUTH_URL ||
  HOVER_SITE_URL
).replace(/\/$/, "");

const GREEN = "#2a514d";

type GiftMailContent = {
  subject: string;
  html: string;
  text: string;
};

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

/** 與官網 formatProductPrice 一致：NT.100、NT.1,000 */
function money(n: number): string {
  return `NT.${Number(n).toLocaleString("en-US")}`;
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
  return mailShellHtml(inner);
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
        <td style="padding:6px 0;font-size:14px;color:#333;">優惠碼</td>
        <td style="padding:6px 0;font-size:14px;color:#111;text-align:right;font-weight:700;letter-spacing:0.06em;">${opts.code}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#333;">可折抵金額</td>
        <td style="padding:6px 0;font-size:14px;color:#111;text-align:right;">${money(opts.amount)}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#333;">使用條件</td>
        <td style="padding:6px 0;font-size:14px;color:#111;text-align:right;">單筆訂單滿 ${min}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#333;">使用次數</td>
        <td style="padding:6px 0;font-size:14px;color:#111;text-align:right;">${opts.usageLimit}</td>
      </tr>
      <tr>
        <td style="padding:6px 0;font-size:14px;color:#333;">有效期限</td>
        <td style="padding:6px 0;font-size:14px;color:#111;text-align:right;">${opts.expiresLabel}</td>
      </tr>
    </table>
    <p style="margin:24px 0 0;">
      <a href="${SITE_URL}" style="color:${GREEN};font-weight:700;text-decoration:underline;font-size:14px;">前往 HOVER 官方網站</a>
    </p>
  `;
}

function giftBlockText(opts: {
  title: string;
  code: string;
  amount: number;
  usageLimit: string;
  expiresLabel: string;
}): string {
  const min = money(MEMBERSHIP_RULES.giftMinSpend);
  return [
    opts.title,
    `優惠碼：${opts.code}`,
    `可折抵金額：${money(opts.amount)}`,
    `使用條件：單筆訂單滿 ${min}`,
    `使用次數：${opts.usageLimit}`,
    `有效期限：${opts.expiresLabel}`,
    "",
    `前往 HOVER 官方網站：${SITE_URL}`,
  ].join("\n");
}

export function buildWelcomeGiftMailHtml(params: {
  memberName?: string;
  email?: string;
  expiresAt?: string | null;
}): GiftMailContent {
  const name = displayName(params.memberName, params.email);
  const expiresLabel = formatExpiry(
    params.expiresAt ||
      expiresAtFromClaimAt(new Date().toISOString(), MEMBERSHIP_RULES.giftValidityDays),
  );
  const gift = {
    title: "入會禮會員權益",
    code: MASTER_COUPONS.welcome,
    amount: MEMBERSHIP_RULES.welcomeGift,
    usageLimit: "每位會員限用一次",
    expiresLabel,
  };
  const html = shell(`
    <p style="margin:0 0 12px;font-size:15px;line-height:1.8;">親愛的${name}，</p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">您的 HOVER 會員帳號已建立完成。</p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">以下為入會禮會員權益明細，結帳時輸入優惠碼即可使用。</p>
    <div style="height:16px;line-height:16px;font-size:16px;">&nbsp;</div>
    ${giftBlock(gift)}
  `);
  const text = [
    `親愛的${name}，`,
    "",
    "您的 HOVER 會員帳號已建立完成。",
    "以下為入會禮會員權益明細，結帳時輸入優惠碼即可使用。",
    "",
    giftBlockText(gift),
    "",
    mailFooterText(),
  ].join("\n");
  return {
    subject: "HOVER 會員入會通知",
    html,
    text,
  };
}

export function buildBirthdayGiftMailHtml(params: {
  memberName?: string;
  email?: string;
  exclusive: boolean;
  expiresAt?: string | null;
}): GiftMailContent {
  const name = displayName(params.memberName, params.email);
  const exclusive = Boolean(params.exclusive);
  const amount = exclusive
    ? MEMBERSHIP_RULES.birthdayExclusive
    : MEMBERSHIP_RULES.birthdayFriends;
  const code = exclusive
    ? MASTER_COUPONS.birthdayExclusive
    : MASTER_COUPONS.birthdayFriends;
  const title = exclusive ? "臻享會員生日禮權益" : "品牌好友生日禮權益";
  const subject = exclusive
    ? "HOVER 臻享會員生日禮通知"
    : "HOVER 會員生日禮通知";
  const expiresLabel = formatExpiry(
    params.expiresAt ||
      expiresAtFromClaimAt(
        new Date().toISOString(),
        MEMBERSHIP_RULES.birthdayValidityDays,
      ),
  );
  const gift = {
    title,
    code,
    amount,
    usageLimit: "每位會員每年度限用一次",
    expiresLabel,
  };

  const html = shell(`
    <p style="margin:0 0 12px;font-size:15px;line-height:1.8;">親愛的${name}，</p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">祝您生日快樂。</p>
    <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">感謝您對 HOVER 的支持，以下為本年度生日禮會員權益明細，結帳時輸入優惠碼即可使用。</p>
    <div style="height:16px;line-height:16px;font-size:16px;">&nbsp;</div>
    ${giftBlock(gift)}
  `);
  const text = [
    `親愛的${name}，`,
    "",
    "祝您生日快樂。",
    "感謝您對 HOVER 的支持，以下為本年度生日禮會員權益明細，結帳時輸入優惠碼即可使用。",
    "",
    giftBlockText(gift),
    "",
    mailFooterText(),
  ].join("\n");
  return { subject, html, text };
}

async function sendGiftMail(to: string, content: GiftMailContent) {
  const transporter = createTransport();
  if (!transporter) {
    console.warn("[membershipGiftMails] SMTP 未設定，略過寄信");
    return false;
  }
  const unsubMailto = `mailto:${HOVER_SUPPORT_EMAIL}?subject=${encodeURIComponent(
    "unsubscribe",
  )}`;
  await transporter.sendMail({
    from: mailFromHeader(),
    replyTo: mailReplyTo(),
    to,
    subject: content.subject,
    text: content.text,
    html: content.html,
    headers: {
      "List-Unsubscribe": `<${unsubMailto}>`,
      "List-Id": `<membership.hoverofficial.com>`,
    },
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
  const content = buildWelcomeGiftMailHtml({
    memberName: params.memberName,
    email: to,
    expiresAt: params.expiresAt,
  });
  await sendGiftMail(to, content);
}

export async function sendMemberBirthdayGiftMail(params: {
  customerEmail: string;
  memberName?: string;
  exclusive: boolean;
  expiresAt?: string | null;
}): Promise<void> {
  const to = String(params.customerEmail || "").trim().toLowerCase();
  if (!to) return;
  const content = buildBirthdayGiftMailHtml({
    memberName: params.memberName,
    email: to,
    exclusive: params.exclusive,
    expiresAt: params.expiresAt,
  });
  await sendGiftMail(to, content);
}
