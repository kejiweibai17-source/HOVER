import { NextResponse } from "next/server";
import {
  invoicePreferenceFromOrderMeta,
  issueEcpayInvoice,
} from "@/lib/ecpay-invoice";
import {
  saveEcpayPaymentInfo,
  verifyEcpayMac,
} from "@/lib/ecpayPaymentInfo";

export const runtime = "nodejs";

const WC_API_BASE = process.env.WC_API_BASE;
const WC_CONSUMER_KEY = process.env.WC_CONSUMER_KEY;
const WC_CONSUMER_SECRET = process.env.WC_CONSUMER_SECRET;

function basicAuth(): string | undefined {
  if (!WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) return undefined;
  return (
    "Basic " +
    Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString("base64")
  );
}

async function parseEcpayBody(req: Request): Promise<Record<string, string>> {
  const formData = await req.formData();
  const data: Record<string, string> = {};
  formData.forEach((value, key) => {
    data[key] = String(value ?? "");
  });
  return data;
}

function invoiceTypeLabel(type: string) {
  switch (type) {
    case "carrier":
      return "手機載具";
    case "triple":
      return "三聯式發票";
    case "donate":
      return "捐贈發票";
    default:
      return "雲端電子發票";
  }
}

export async function POST(req: Request) {
  try {
    const data = await parseEcpayBody(req);
    console.log(
      "🟢 收到綠界回傳數據:",
      data.MerchantTradeNo,
      "RtnCode:",
      data.RtnCode,
    );

    if (!verifyEcpayMac(data)) {
      console.error("❌ 綠界 CheckMacValue 驗證失敗");
      return new NextResponse("0|CheckMacValueVerifyFail");
    }

    const orderId = data.CustomField1;
    const auth = basicAuth();
    const wcBaseUrl = WC_API_BASE?.replace(/\/$/, "");

    if (!orderId || !wcBaseUrl || !auth) {
      console.error("❌ 缺少 OrderId 或 WooCommerce 連線設定");
      return new NextResponse("1|OK");
    }

    if (data.RtnCode === "2") {
      await saveEcpayPaymentInfo(data);
      return new NextResponse("1|OK");
    }

    if (data.RtnCode === "1") {
      const customerEmail = data.CustomField2;
      const tradeAmount = Math.round(
        Number(data.TradeAmt || data.CustomField3 || 0),
      );

      const wcRes = await fetch(`${wcBaseUrl}/wp-json/wc/v3/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: auth },
        body: JSON.stringify({
          status: "processing",
          set_paid: true,
          transaction_id: data.TradeNo,
        }),
      });

      await fetch(`${wcBaseUrl}/wp-json/wc/v3/orders/${orderId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth },
        body: JSON.stringify({
          note: `🟢 綠界付款成功。交易單號：${data.TradeNo}`,
        }),
      });

      if (wcRes.ok) console.log(`✅ 訂單 #${orderId} 狀態已更新為 processing`);
      else console.error(`❌ 訂單 #${orderId} 狀態更新失敗`);

      if (customerEmail && tradeAmount > 0) {
        try {
          const orderRes = await fetch(
            `${wcBaseUrl}/wp-json/wc/v3/orders/${orderId}`,
            { headers: { Authorization: auth }, cache: "no-store" },
          );
          const order = orderRes.ok ? await orderRes.json() : null;
          const invoice = invoicePreferenceFromOrderMeta(order?.meta_data);
          const rawName =
            `${order?.billing?.last_name || ""}${order?.billing?.first_name || ""}`.trim();
          const relateNumber =
            `INV${orderId}${Date.now().toString().slice(-6)}`.slice(0, 30);

          await issueEcpayInvoice({
            relateNumber,
            customerEmail:
              customerEmail || order?.billing?.email || "service@hoverofficial.com",
            customerName: rawName || "HOVER顧客",
            customerPhone: order?.billing?.phone || "",
            customerAddr: order?.billing?.address_1 || "",
            salesAmount: tradeAmount,
            invoice,
            items: [
              {
                ItemName: "HOVER官方商城訂單",
                ItemCount: 1,
                ItemWord: "式",
                ItemPrice: tradeAmount,
                ItemAmount: tradeAmount,
              },
            ],
          });
          console.log(
            `🧾 訂單 #${orderId} 電子發票已成功開立（${invoiceTypeLabel(invoice.type)}）`,
          );
          await fetch(`${wcBaseUrl}/wp-json/wc/v3/orders/${orderId}/notes`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: auth,
            },
            body: JSON.stringify({
              note: `🧾 綠界電子發票開立成功（${invoiceTypeLabel(invoice.type)}｜RelateNumber: ${relateNumber}）`,
            }),
          });
        } catch (invoiceErr) {
          console.error("❌ 電子發票開立失敗:", invoiceErr);
          await fetch(`${wcBaseUrl}/wp-json/wc/v3/orders/${orderId}/notes`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: auth,
            },
            body: JSON.stringify({
              note: `❌ 綠界電子發票開立失敗：${
                invoiceErr instanceof Error
                  ? invoiceErr.message
                  : String(invoiceErr)
              }`,
            }),
          });
        }
      }
    }

    return new NextResponse("1|OK");
  } catch (error) {
    console.error("ECPay Callback 錯誤:", error);
    return new NextResponse("1|OK");
  }
}
