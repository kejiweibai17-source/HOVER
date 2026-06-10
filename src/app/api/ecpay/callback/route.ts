import { NextResponse } from "next/server";
import crypto from "crypto";
import { issueEcpayInvoice } from "@/lib/ecpay-invoice";

export const runtime = "nodejs";

const {
  WC_API_BASE,
  WC_CONSUMER_KEY,
  WC_CONSUMER_SECRET,
  ECPAY_HASH_KEY,
  ECPAY_HASH_IV,
} = process.env;

// 產生綠界檢查碼
function generateCheckMacValue(params: Record<string, string>, hashKey: string, hashIv: string): string {
  const keys = Object.keys(params).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
  let raw = `HashKey=${hashKey}`;
  keys.forEach((k) => {
    // ⚠️ 關鍵：計算時必須排除 CheckMacValue 本身
    if (k !== "CheckMacValue") {
      raw += `&${k}=${params[k]}`;
    }
  });
  raw += `&HashIV=${hashIv}`;
  const encoded = encodeURIComponent(raw)
    .toLowerCase()
    .replace(/%20/g, "+").replace(/%2d/g, "-").replace(/%5f/g, "_").replace(/%2e/g, ".")
    .replace(/%21/g, "!").replace(/%2a/g, "*").replace(/%28/g, "(").replace(/%29/g, ")");
  return crypto.createHash("sha256").update(encoded).digest("hex").toUpperCase();
}

// 建立安全的 Basic Auth 標頭給 WooCommerce API 使用
function basicAuth(): string | undefined {
  if (!WC_CONSUMER_KEY || !WC_CONSUMER_SECRET) return undefined;
  return "Basic " + Buffer.from(`${WC_CONSUMER_KEY}:${WC_CONSUMER_SECRET}`).toString("base64");
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const data: Record<string, string> = {};
    formData.forEach((value, key) => { data[key] = String(value ?? ""); });

    console.log("🟢 收到綠界回傳數據:", data.MerchantTradeNo, "RtnCode:", data.RtnCode);

    if (!ECPAY_HASH_KEY || !ECPAY_HASH_IV) return new NextResponse("0|HashKeyOrIVMissing");

    const receivedMac = data.CheckMacValue || "";
    const computedMac = generateCheckMacValue(data, ECPAY_HASH_KEY, ECPAY_HASH_IV);
    
    // =========================================================================
    // ⚠️ 測試環境後門：暫時註解掉 CheckMacValue 驗證，以便我們在本機用指令測試
    // 🚨 警告：上線推到 Vercel 之前，請務必把下面這段的註解 (//) 拿掉！
    // =========================================================================
  
    if (receivedMac !== computedMac) {
       console.error("❌ 綠界 CheckMacValue 驗證失敗");
       return new NextResponse("0|CheckMacValueVerifyFail");
    }
  
    // =========================================================================

    const orderId = data.CustomField1;
    const auth = basicAuth();
    const wcBaseUrl = WC_API_BASE?.replace(/\/$/, "");

    if (!orderId || !wcBaseUrl || !auth) {
        console.error("❌ 缺少 OrderId 或 WooCommerce 連線設定");
        return new NextResponse("1|OK");
    }

    // 💡 情況 A：取得 ATM 虛擬帳號/超商代碼成功 (RtnCode 是 2)
    if (data.RtnCode === "2") {
      const bankCode = data.BankCode || "";
      const vAccount = data.vAccount || "";
      const expireDate = data.ExpireDate || "";
      const paymentNo = data.PaymentNo || "";

      const metaData = [];
      let customerNote = "";

      if (data.PaymentType?.includes("ATM")) {
        metaData.push({ key: "_vAccount", value: vAccount });
        metaData.push({ key: "_BankCode", value: bankCode });
        metaData.push({ key: "_ExpireDate", value: expireDate });
        customerNote = `【轉帳資訊】銀行代碼: ${bankCode}，虛擬帳號: ${vAccount}，繳費期限: ${expireDate}`;
      } else if (data.PaymentType?.includes("CVS") || data.PaymentType?.includes("BARCODE")) {
        metaData.push({ key: "_PaymentNo", value: paymentNo });
        metaData.push({ key: "_ExpireDate", value: expireDate });
        customerNote = `【超商代碼】繳費代碼: ${paymentNo}，繳費期限: ${expireDate}`;
      }

      if (metaData.length > 0) {
        // 1. 更新自訂欄位
        const wcRes = await fetch(`${wcBaseUrl}/wp-json/wc/v3/orders/${orderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", "Authorization": auth },
          body: JSON.stringify({ meta_data: metaData }),
        });
        
        // 2. 寫入訂單備註 (讓客人與後台都能看見)
        await fetch(`${wcBaseUrl}/wp-json/wc/v3/orders/${orderId}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": auth },
          body: JSON.stringify({ note: customerNote, customer_note: true })
        });

        if (wcRes.ok) console.log(`✅ 訂單 #${orderId} 的取號資訊已存入 WooCommerce`);
        else console.error(`❌ 訂單 #${orderId} 取號資訊存入失敗`);
      }
      return new NextResponse("1|OK");
    }

    // 💡 情況 B：實際付款成功 (RtnCode 是 1)
    if (data.RtnCode === "1") {
      const customerEmail = data.CustomField2;
      const tradeAmount = Math.round(Number(data.TradeAmt || data.CustomField3 || 0));

      // 1) 更新 Woo 訂單為已付款 (processing)
      const wcRes = await fetch(`${wcBaseUrl}/wp-json/wc/v3/orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": auth },
        body: JSON.stringify({ status: "processing", set_paid: true, transaction_id: data.TradeNo }),
      });

      // 2) 寫入成功付款備註
      await fetch(`${wcBaseUrl}/wp-json/wc/v3/orders/${orderId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": auth },
        body: JSON.stringify({ note: `🟢 綠界付款成功。交易單號：${data.TradeNo}` })
      });

      if (wcRes.ok) console.log(`✅ 訂單 #${orderId} 狀態已更新為 processing`);
      else console.error(`❌ 訂單 #${orderId} 狀態更新失敗`);

      // 3) 開立電子發票
      if (customerEmail && tradeAmount > 0) {
        try {
          const relateNumber = `INV${orderId}${Date.now().toString().slice(-6)}`.slice(0, 30);
          await issueEcpayInvoice({
            relateNumber,
            customerEmail,
            salesAmount: tradeAmount,
            items: [{
              ItemName: "UFLOW保健食品",
              ItemCount: 1,
              ItemWord: "式",
              ItemPrice: tradeAmount,
              ItemAmount: tradeAmount,
            }],
          });
          console.log(`🧾 訂單 #${orderId} 電子發票已成功開立並寄出`);
        } catch (invoiceErr) {
          console.error("❌ 電子發票開立失敗:", invoiceErr);
        }
      }
    }

    return new NextResponse("1|OK");
  } catch (error) {
    console.error("ECPay Callback 錯誤:", error);
    return new NextResponse("1|OK"); 
  }
}