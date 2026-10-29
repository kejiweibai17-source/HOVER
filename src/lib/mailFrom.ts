/**
 * 會員／交易信件統一寄件人
 * - 實際顯示：HOVER <service@hoverofficial.com>
 * - SMTP 登入仍用 SMTP_USER／SMTP_PASS（Google Workspace 需已設定「以 service@ 傳送」）
 */
export const MAIL_FROM_ADDRESS = (
  process.env.MAIL_FROM ||
  process.env.SMTP_FROM ||
  "service@hoverofficial.com"
)
  .trim()
  .toLowerCase();

export const MAIL_FROM_NAME = (process.env.MAIL_FROM_NAME || "HOVER").trim() || "HOVER";

/** nodemailer `from`／`replyTo` 用 */
export function mailFromHeader(name: string = MAIL_FROM_NAME): string {
  const addr = MAIL_FROM_ADDRESS || "service@hoverofficial.com";
  return `"${name.replace(/"/g, "")}" <${addr}>`;
}

export function mailReplyTo(): string {
  return MAIL_FROM_ADDRESS || "service@hoverofficial.com";
}
