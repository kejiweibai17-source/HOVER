/**
 * 會員／交易信件統一寄件人
 * - 實際顯示：HOVER <service@hoverofficial.com>
 * - SMTP 登入仍用 SMTP_USER／SMTP_PASS（Google Workspace 需已設定「以 service@ 傳送」）
 */
import { HOVER_LINE_OA, HOVER_SITE_URL } from "@/lib/hoverContact";

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

const SITE = HOVER_SITE_URL.replace(/\/$/, "");
const LINE = HOVER_LINE_OA;
const GREEN = "#2a514d";

/** 全站會員／交易信統一頁尾（三行＋可點連結） */
export function mailFooterHtml(): string {
  return `
          <div style="margin-top:36px;padding-top:20px;border-top:1px solid #ddd;font-size:12px;line-height:1.8;color:#777;text-align:center;">
            <p style="margin:0;text-align:center;">此為系統自動發送信件，請勿直接回覆。</p>
            <p style="margin:8px 0 0;text-align:center;">
              HOVER 官方網站｜<a href="${SITE}" style="color:${GREEN};text-decoration:underline;">hoverofficial.com</a><br />
              客服聯繫｜<a href="${LINE}" style="color:${GREEN};text-decoration:underline;">HOVER 官方 LINE</a>
            </p>
          </div>`;
}

export function mailFooterText(): string {
  return [
    "此為系統自動發送信件，請勿直接回覆。",
    "HOVER 官方網站｜https://hoverofficial.com",
    `客服聯繫｜HOVER 官方 LINE（${LINE}）`,
  ].join("\n");
}
