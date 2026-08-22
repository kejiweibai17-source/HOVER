// app/api/linepay/confirm/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import {
  invoicePreferenceFromOrderMeta,
  issueEcpayInvoice,
} from "@/lib/ecpay-invoice";

export const runtime = "nodejs";

const BASE = process.env.WC_API_BASE!;
const CK = process.env.WC_CONSUMER_KEY!;
const CS = process.env.WC_CONSUMER_SECRET!;

const LINEPAY_CHANNEL_ID = process.env.LINEPAY_CHANNEL_ID!;
const LINEPAY_CHANNEL_SECRET = process.env.LINEPAY_CHANNEL_SECRET!;
const LINEPAY_BASE_URL = process.env.LINEPAY_BASE_URL || "https://api-pay.line.me";

function basicAuth() {
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

function generateLinePaySignature(
  uri: string,
  requestBody: string,
  nonce: string,
): string {
  const message = `${LINEPAY_CHANNEL_SECRET}${uri}${requestBody}${nonce}`;
  return crypto
    .createHmac("sha256", LINEPAY_CHANNEL_SECRET)
    .update(message)
    .digest("base64");
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const transactionId = url.searchParams.get("transactionId");
    const orderId = url.searchParams.get("orderId");
    const urlAmount = url.searchParams.get("amount");

    console.log("=========================================");
    console.log("🟢 [LINE Pay] 進入 Confirm 階段");

    if (!transactionId || !orderId) {
      return NextResponse.redirect(new URL(`/cart?error=missing`, req.url));
    }

    const auth = basicAuth();

    const wcOrderRes = await fetch(
      `${BASE.replace(/\/$/, "")}/wp-json/wc/v3/orders/${orderId}`,
      { headers: { Authorization: auth! }, cache: "no-store" },
    );

    if (!wcOrderRes.ok) {
      return NextResponse.redirect(
        new URL(`/cart?error=order_not_found`, req.url),
      );
    }
    const wcOrder = await wcOrderRes.json();

    const amount = urlAmount
      ? Number(urlAmount)
      : Math.round(Number(wcOrder.total));

    const nonce = crypto.randomUUID();
    const confirmUri = `/v3/payments/${transactionId}/confirm`;
    const confirmPayload = JSON.stringify({ amount: amount, currency: "TWD" });
    const signature = generateLinePaySignature(
      confirmUri,
      confirmPayload,
      nonce,
    );

    const lpRes = await fetch(`${LINEPAY_BASE_URL}${confirmUri}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-LINE-ChannelId": LINEPAY_CHANNEL_ID,
        "X-LINE-Authorization-Nonce": nonce,
        "X-LINE-Authorization": signature,
      },
      body: confirmPayload,
    });

    const lpData = await lpRes.json();

    if (lpData.returnCode === "0000") {
      console.log("✅ [LINE Pay] 扣款成功！準備更新訂單與開立發票...");

      await fetch(`${BASE.replace(/\/$/, "")}/wp-json/wc/v3/orders/${orderId}`, {
        method: "PUT",
        headers: { Authorization: auth!, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "processing", set_paid: true }),
      });

      try {
        const rawName =
          `${wcOrder.billing?.last_name || ""}${wcOrder.billing?.first_name || ""}`.trim();
        const invoice = invoicePreferenceFromOrderMeta(wcOrder.meta_data);
        const relateNumber =
          `UF${orderId}${Date.now().toString().slice(-6)}`.slice(0, 30);

        await issueEcpayInvoice({
          relateNumber,
          customerEmail:
            wcOrder.billing?.email || "service@hoverofficial.com",
          customerName: rawName || "HOVER顧客",
          customerPhone: wcOrder.billing?.phone || "",
          customerAddr: wcOrder.billing?.address_1 || "",
          salesAmount: amount,
          invoice,
          items: [
            {
              ItemName: "HOVER官方商城訂單",
              ItemCount: 1,
              ItemWord: "式",
              ItemPrice: amount,
              ItemAmount: amount,
            },
          ],
        });
        console.log(`✅ [綠界發票] 開立成功（${invoice.type}）`);
      } catch (invErr) {
        console.error("❌ 綠界發票執行異常:", invErr);
      }

      return NextResponse.redirect(
        new URL(`/thank-you?orderId=${orderId}`, req.url),
      );
    }

    console.error(`❌ [LINE Pay] 請款失敗！錯誤碼: ${lpData.returnCode}`);
    return NextResponse.redirect(
      new URL(
        `/cart?error=payment_failed&msg=${encodeURIComponent(lpData.returnMessage || "")}`,
        req.url,
      ),
    );
  } catch (e: any) {
    console.error("❌ 系統發生預期外錯誤:", e);
    return NextResponse.redirect(
      new URL(`/cart?error=system_error`, req.url),
    );
  }
}
