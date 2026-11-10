/**
 * 會員／交易信件統一寄件人、Logo、信尾
 * - 實際顯示：HOVER <service@hoverofficial.com>
 * - SMTP 登入仍用 SMTP_USER／SMTP_PASS（Google Workspace 需已設定「以 service@ 傳送」）
 * - Logo／信尾與 WP 訂單信（hover-order-email-templates.php）規格對齊
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

/** 與 WP 訂單信一致的品牌字 Logo（置中、統一字級） */
export function mailBrandLogoHtml(): string {
  return `
          <div style="margin:0 0 28px;text-align:center;width:100%;">
            <a href="${SITE}" style="display:inline-block;text-decoration:none;border:0;color:#111;">
              <span style="display:inline-block;font-family:Georgia,'Times New Roman','Noto Serif HK',serif;font-size:32px;letter-spacing:0.28em;font-weight:700;line-height:1.2;color:#111;">HOVER</span>
            </a>
          </div>`;
}

/** 全站會員／交易信統一頁尾（置中） */
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

/** 白底置中信件外殼（入會禮／驗證信等共用） */
export function mailShellHtml(inner: string): string {
  return `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#f6f6f6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f6f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;padding:32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111;">
        <tr><td>
          ${mailBrandLogoHtml()}
          ${inner}
          ${mailFooterHtml()}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}
