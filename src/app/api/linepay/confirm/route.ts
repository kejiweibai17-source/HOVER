// app/api/linepay/confirm/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

const BASE = process.env.WC_API_BASE!;
const CK = process.env.WC_CONSUMER_KEY!;
const CS = process.env.WC_CONSUMER_SECRET!;

const LINEPAY_CHANNEL_ID = process.env.LINEPAY_CHANNEL_ID!;
const LINEPAY_CHANNEL_SECRET = process.env.LINEPAY_CHANNEL_SECRET!;
const LINEPAY_BASE_URL = process.env.LINEPAY_BASE_URL || "https://api-pay.line.me"; 

// ============================================================================
// 🚀 綠界發票 V2 (AES 加密) 正式環境變數設定
// ============================================================================
const envMerchantId = (process.env.ECPAY_INVOICE_MERCHANT_ID || "").trim();
const isProdInvoice = envMerchantId.length > 0 && envMerchantId !== "2000132";

const INV_MERCHANT_ID = isProdInvoice ? envMerchantId : "2000132";
const INV_HASH_KEY = isProdInvoice ? (process.env.ECPAY_INVOICE_HASH_KEY || "").trim() : "ejCk326UnaZWKisg";
const INV_HASH_IV = isProdInvoice ? (process.env.ECPAY_INVOICE_HASH_IV || "").trim() : "q9jcZX8Ib9LM8wYk";

const ECPAY_INVOICE_URL = isProdInvoice 
  ? "https://einvoice.ecpay.com.tw/B2CInvoice/Issue" 
  : "https://einvoice-stage.ecpay.com.tw/B2CInvoice/Issue";
// ============================================================================

function basicAuth() {
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

function generateLinePaySignature(uri: string, requestBody: string, nonce: string): string {
  const message = `${LINEPAY_CHANNEL_SECRET}${uri}${requestBody}${nonce}`;
  return crypto.createHmac("sha256", LINEPAY_CHANNEL_SECRET).update(message).digest("base64");
}

/**
 * 🚀 綠界發票 V2 專用：AES-128-CBC 加密器
 */
function encryptECPayData(dataObj: object): string {
  const jsonString = JSON.stringify(dataObj);
  // JSON 轉 URL Encode (綠界特別要求把空白換成 +)
  const urlEncoded = encodeURIComponent(jsonString).replace(/%20/g, '+');
  
  // 進行 AES-128-CBC 加密
  const cipher = crypto.createCipheriv('aes-128-cbc', INV_HASH_KEY, INV_HASH_IV);
  let encrypted = cipher.update(urlEncoded, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  
  return encrypted;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const transactionId = url.searchParams.get("transactionId");
    const orderId = url.searchParams.get("orderId"); 
    const urlAmount = url.searchParams.get("amount"); 

    console.log("=========================================");
    console.log(`🟢 [LINE Pay] 進入 Confirm 階段 (發票環境: ${isProdInvoice ? "🔴 正式上線 (V2 AES)" : "🟡 沙盒測試"})`);

    if (!transactionId || !orderId) return NextResponse.redirect(new URL(`/cart?error=missing`, req.url));

    const auth = basicAuth();
    
    // 1. 去 WooCommerce 抓取真實訂單資料
    const wcOrderRes = await fetch(`${BASE.replace(/\/$/, "")}/wp-json/wc/v3/orders/${orderId}`, {
      headers: { Authorization: auth! },
      cache: "no-store"
    });
    
    if (!wcOrderRes.ok) return NextResponse.redirect(new URL(`/cart?error=order_not_found`, req.url));
    const wcOrder = await wcOrderRes.json();
    
    const amount = urlAmount ? Number(urlAmount) : Math.round(Number(wcOrder.total));
    
    // 2. LINE Pay Confirm 扣款
    const nonce = crypto.randomUUID();
    const confirmUri = `/v3/payments/${transactionId}/confirm`;
    const confirmPayload = JSON.stringify({ amount: amount, currency: "TWD" });
    const signature = generateLinePaySignature(confirmUri, confirmPayload, nonce);

    const lpRes = await fetch(`${LINEPAY_BASE_URL}${confirmUri}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-LINE-ChannelId": LINEPAY_CHANNEL_ID,
        "X-LINE-Authorization-Nonce": nonce,
        "X-LINE-Authorization": signature,
      },
      body: confirmPayload
    });

    const lpData = await lpRes.json();

    if (lpData.returnCode === "0000") {
      console.log("✅ [LINE Pay] 扣款成功！準備更新訂單與開立發票...");
      
      // 更新 WooCommerce 狀態為處理中，並標記已付款
      await fetch(`${BASE.replace(/\/$/, "")}/wp-json/wc/v3/orders/${orderId}`, {
        method: "PUT",
        headers: { Authorization: auth!, "Content-Type": "application/json" },
        body: JSON.stringify({ status: "processing", set_paid: true }),
      });

      // ============================================================================
      // 🧾 3. 呼叫綠界發票 (V2 AES 架構)
      // ============================================================================
      try {
        console.log("🧾 [綠界發票] 開始準備開票參數...");
        
        // 🔄 恢復動態抓取真實顧客資料 (V2 AES 支援所有中文與特殊符號，不需淨化！)
        const rawName = (wcOrder.billing.last_name || "") + (wcOrder.billing.first_name || "");
        const customerName = rawName || "HOVER客戶";
        const customerEmail = wcOrder.billing.email || "service@hoverofficial.com";
        const customerPhone = wcOrder.billing.phone || "0900000000"; 
        
        let customerAddr = wcOrder.billing.address_1 || "";
        if (customerAddr.length < 3) customerAddr = "不提供實體地址";

        // V2 要求的資料結構
        const dataObj = {
          MerchantID: INV_MERCHANT_ID,
          RelateNumber: `UF${orderId}${Date.now().toString().slice(-6)}`, 
          CustomerName: customerName.substring(0, 30),
          CustomerAddr: customerAddr,
          CustomerPhone: customerPhone,
          CustomerEmail: customerEmail,
          Print: "0",
          Donation: "0",
          CarruerType: "1", 
          TaxType: "1", 
          SalesAmount: amount,
          InvoiceRemark: "LINEPay",
          Items: [
            {
              ItemName: "HOVER官方商城訂單",
              ItemCount: 1,
              ItemWord: "式",
              ItemPrice: amount,
              ItemTaxType: "1",
              ItemAmount: amount
            }
          ],
          InvType: "07", 
        };

        // 進行 AES 加密
        const encryptedData = encryptECPayData(dataObj);

        // V2 規定的外層 Payload 格式
        const requestBody = {
          MerchantID: INV_MERCHANT_ID,
          RqHeader: {
            Timestamp: Math.floor(Date.now() / 1000)
          },
          Data: encryptedData
        };

        console.log(`🧾 [綠界發票] 發送 V2 JSON 請求至綠界...`);
        
        const invRes = await fetch(ECPAY_INVOICE_URL, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json" 
          },
          body: JSON.stringify(requestBody)
        });

        const invData = await invRes.json();
        
        if (invData.TransCode === 1) {
            console.log(`✅ [綠界發票] V2 開立成功！TransCode: 1`);
        } else {
            console.error(`❌ [綠界發票] 開立失敗，綠界回傳:`, invData);
        }

      } catch (invErr) {
        console.error("❌ 綠界發票執行異常:", invErr);
      }
      // ============================================================================

      return NextResponse.redirect(new URL(`/thank-you?orderId=${orderId}`, req.url));
      
    } else {
      console.error(`❌ [LINE Pay] 請款失敗！錯誤碼: ${lpData.returnCode}`);
      return NextResponse.redirect(new URL(`/cart?error=payment_failed&msg=${encodeURIComponent(lpData.returnMessage)}`, req.url));
    }

  } catch (e: any) {
    console.error("❌ 系統發生預期外錯誤:", e);
    return NextResponse.redirect(new URL(`/cart?error=system_error`, req.url));
  }
}