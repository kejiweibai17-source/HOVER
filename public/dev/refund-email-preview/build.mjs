import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const G = "#2a514d";
const LOGO = "/images/logo/title-logo.png";
const SITE = "https://hoverofficial.com";
const LINE = "https://line.me/R/ti/p/@330kefmm";
const ORDERS = "https://hoverofficial.com/account?tab=orders";

const check = `
<div style="margin:8px 0 16px;text-align:center;">
  <div style="display:inline-block;width:56px;height:56px;border-radius:50%;background:${G};line-height:56px;text-align:center;">
    <span style="color:#fff;font-size:28px;font-weight:700;">✓</span>
  </div>
</div>`;

const section = (t) =>
  `<h2 style="margin:28px 0 12px;font-size:15px;letter-spacing:0.08em;color:${G};font-weight:700;">${t}</h2>`;

const kv = (l, v, bold = false, color = "#111") => `
<tr>
  <td style="padding:6px 0;font-size:14px;color:#333;font-weight:${bold ? 700 : 400};">${l}</td>
  <td style="padding:6px 0;font-size:14px;color:${color};text-align:right;font-weight:${bold ? 700 : 400};">${v}</td>
</tr>`;

const amt = (l, v, color = "#111") => `
<tr>
  <td style="padding:5px 12px;font-size:13px;color:#333;">${l}</td>
  <td style="padding:5px 12px;font-size:13px;color:${color};text-align:right;white-space:nowrap;">${v}</td>
</tr>`;

function productRow(name, opts, qty, price) {
  return `
<tr>
  <td style="padding:12px 0;border-bottom:1px solid #eee;vertical-align:top;width:72px;">
    <div style="width:64px;height:80px;background:#f0f0f0;border-radius:2px;"></div>
  </td>
  <td style="padding:12px 0 12px 12px;border-bottom:1px solid #eee;font-size:13px;line-height:1.5;vertical-align:top;">
    <div style="font-weight:600;">${name}</div>
    ${opts ? `<div style="margin-top:4px;color:#555;">${opts}</div>` : ""}
    <div style="margin-top:4px;color:#555;">×${qty}　${price}</div>
  </td>
</tr>`;
}

function rules(partial, fulfillment) {
  let lines;
  if (!partial) {
    lines = [
      "退款金額＝商品實付金額＋原訂單已收取的運費；若原訂單未收取運費，則無運費退款。",
      "退貨寄回運費由 HOVER 吸收。",
    ];
    lines.unshift(
      fulfillment === "pre_ship"
        ? "本訂單商品尚未寄出，您無須寄回商品。"
        : "請依客服指示將退貨商品完整寄回（含吊牌、配件與贈品，如適用）。",
    );
  } else {
    lines = [
      "退款金額僅退還退貨商品的實際支付金額。",
      "原訂單已收取的運費不退；部分退貨後即使未達免運門檻，亦不重新追收運費。",
      "若部分退貨後未達原滿額贈活動門檻，滿額贈品須一併退回。",
      "加價購商品可選擇一併退回；若您選擇保留，則恢復原價計算，原價與加價購優惠價之差額將自退款金額中扣除。",
      "退貨寄回運費由 HOVER 吸收。",
    ];
    lines.unshift(
      fulfillment === "pre_ship"
        ? "本次取消／退款商品尚未寄出，您無須寄回商品。"
        : "請依客服指示將退貨商品（及須一併退回之贈品）完整寄回。",
    );
  }
  const lis = lines
    .map(
      (line, i) =>
        `<li style="margin:0 0 8px;padding-left:4px;">${i + 1}. ${line}</li>`,
    )
    .join("");
  return (
    section("退款說明") +
    `<ol style="margin:0;padding:0 0 0 4px;list-style:none;font-size:13px;line-height:1.8;color:#555;">${lis}</ol>`
  );
}

function shell(inner, label) {
  return `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${label}</title></head>
<body style="margin:0;padding:0;background:#f6f6f6;">
  <div style="position:sticky;top:0;z-index:10;background:#2a514d;color:#fff;text-align:center;padding:10px 12px;font-size:13px;letter-spacing:0.06em;">模擬預覽｜${label}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f6f6;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;padding:32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111;">
        <tr><td>
          <div style="margin:0 0 28px;text-align:center;"><a href="${SITE}"><img src="${LOGO}" alt="HOVER" width="180" style="display:block;margin:0 auto;width:180px;max-width:70%;height:auto;border:0;" /></a></div>
          ${inner}
          <div style="margin-top:36px;padding-top:20px;border-top:1px solid #ddd;font-size:12px;line-height:1.8;color:#777;text-align:center;">
            <p style="margin:0;">此為系統自動發送信件，請勿直接回覆。</p>
            <p style="margin:8px 0 0;">HOVER 官方網站｜<a href="${SITE}" style="color:${G};">hoverofficial.com</a><br />客服聯繫｜<a href="${LINE}" style="color:${G};">HOVER 官方 LINE</a></p>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function render({ fulfillment, partial, orderNo, refundAmt, refundDate, productsHtml, amountRows, title, lead, productsTitle, amountTitle, badgeA, badgeB }) {
  const inner = `
      ${check}
      <h1 style="margin:0 0 8px;text-align:center;font-size:22px;font-weight:700;color:#111;">${title}</h1>
      <p style="margin:0 0 4px;text-align:center;font-size:13px;color:#888;">訂單編號｜${orderNo}</p>
      <p style="margin:0 0 12px;text-align:center;font-size:12px;letter-spacing:0.06em;color:#888;">${badgeA}　｜　${badgeB}</p>
      <p style="margin:16px 0 8px;font-size:15px;line-height:1.8;">親愛的王小明，</p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.8;color:#333;">${lead}</p>

      ${section("退款資訊")}
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        ${kv("訂單編號", orderNo)}
        ${kv("退款類型", badgeB)}
        ${kv("退款金額", refundAmt, true, G)}
        ${kv("退款日期", refundDate)}
        ${kv("付款方式", "信用卡")}
      </table>

      ${section(productsTitle)}
      <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        ${productsHtml}
      </table>

      ${section(amountTitle)}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;">
        <tr><td align="right">
          <table role="presentation" align="right" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;max-width:360px;">
            ${amountRows}
            <tr>
              <td style="padding:14px 12px;background:#edf4f3;font-size:15px;font-weight:700;color:#111;">退款金額</td>
              <td style="padding:14px 12px;background:#edf4f3;font-size:18px;font-weight:700;color:${G};text-align:right;white-space:nowrap;">${refundAmt}</td>
            </tr>
          </table>
        </td></tr>
      </table>

      ${rules(partial, fulfillment)}
      <p style="margin:16px 0 0;font-size:13px;line-height:1.8;color:#555;">退款將退回原付款信用卡，約需 7–14 個工作天入帳（依發卡銀行作業時間而定）。</p>
      <p style="margin:8px 0 0;font-size:13px;line-height:1.8;color:#555;">如有疑問，請透過 <a href="${LINE}" style="color:${G};text-decoration:underline;">HOVER 官方 LINE</a> 聯繫客服。</p>
      <p style="margin:24px 0 0;"><a href="${ORDERS}" style="color:${G};font-weight:700;text-decoration:underline;font-size:14px;">查看訂單</a></p>
  `;
  return shell(inner, `${badgeA}｜${badgeB}`);
}

const variants = [
  {
    file: "01-pre-ship-full.html",
    fulfillment: "pre_ship",
    partial: false,
    orderNo: "HV261102001",
    refundAmt: "NT$1,280",
    refundDate: "2026/11/02",
    title: "退款已完成",
    lead: "您的訂單尚未寄出，全部退款已完成。您無須寄回商品。以下為退款明細。",
    productsTitle: "商品資訊",
    amountTitle: "金額明細",
    badgeA: "已付款尚未出貨",
    badgeB: "全部退款",
    productsHtml:
      productRow("Classic Cap", "顏色：Black　尺寸：F", 1, "NT$980") +
      productRow("Daily Socks", "顏色：Ivory　尺寸：F", 1, "NT$220"),
    amountRows:
      amt("商品實付金額", "NT$1,200") + amt("運費（原訂單已收取）", "NT$80"),
  },
  {
    file: "02-pre-ship-partial.html",
    fulfillment: "pre_ship",
    partial: true,
    orderNo: "HV261102002",
    refundAmt: "NT$980",
    refundDate: "2026/11/02",
    title: "部分退款已完成",
    lead: "您取消／退款的商品尚未寄出，退款已完成。您無須寄回商品。以下為本次退款明細。",
    productsTitle: "退貨商品",
    amountTitle: "退款金額明細",
    badgeA: "已付款尚未出貨",
    badgeB: "部分退款",
    productsHtml: productRow("Classic Cap", "顏色：Black　尺寸：F", 1, "NT$980"),
    amountRows: amt("退貨商品實付", "NT$980"),
  },
  {
    file: "03-received-full.html",
    fulfillment: "received",
    partial: false,
    orderNo: "HV261102003",
    refundAmt: "NT$1,280",
    refundDate: "2026/11/02",
    title: "退款已完成",
    lead: "您的訂單退款已完成。以下為退款明細，請核對。",
    productsTitle: "商品資訊",
    amountTitle: "金額明細",
    badgeA: "已付款已取貨",
    badgeB: "全部退款",
    productsHtml:
      productRow("Classic Cap", "顏色：Black　尺寸：F", 1, "NT$980") +
      productRow("Daily Socks", "顏色：Ivory　尺寸：F", 1, "NT$220"),
    amountRows:
      amt("商品實付金額", "NT$1,200") + amt("運費（原訂單已收取）", "NT$80"),
  },
  {
    file: "04-received-partial.html",
    fulfillment: "received",
    partial: true,
    orderNo: "HV261102004",
    refundAmt: "NT$980",
    refundDate: "2026/11/02",
    title: "部分退款已完成",
    lead: "您申請退貨的商品，退款已完成。以下為本次退款明細，請核對。",
    productsTitle: "退貨商品",
    amountTitle: "退款金額明細",
    badgeA: "已付款已取貨",
    badgeB: "部分退款",
    productsHtml: productRow("Classic Cap", "顏色：Black　尺寸：F", 1, "NT$980"),
    amountRows: amt("退貨商品實付", "NT$980"),
  },
];

const indexLinks = variants
  .map(
    (v, i) =>
      `<li style="margin:0 0 12px;"><a href="./${v.file}" style="color:${G};font-size:16px;">${i + 1}. ${v.badgeA} × ${v.badgeB}</a></li>`,
  )
  .join("");

fs.writeFileSync(
  path.join(__dirname, "index.html"),
  `<!DOCTYPE html><html lang="zh-Hant"><head><meta charset="UTF-8"/><title>退款信四種模擬</title></head>
<body style="font-family:system-ui;padding:40px;background:#f7f6f3;color:#111;">
  <h1 style="color:${G};">HOVER 退款信｜四種組合模擬</h1>
  <ol style="line-height:1.8;">${indexLinks}</ol>
</body></html>`,
);

for (const v of variants) {
  fs.writeFileSync(path.join(__dirname, v.file), render(v));
}
console.log("ok", variants.map((v) => v.file).join(", "));
