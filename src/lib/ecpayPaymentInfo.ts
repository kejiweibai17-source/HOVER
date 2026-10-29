import { generateCheckMacValue } from "@/lib/ecpay";

function basicAuth() {
  const CK = process.env.WC_CONSUMER_KEY;
  const CS = process.env.WC_CONSUMER_SECRET;
  if (!CK || !CS) return undefined;
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

function wcBase() {
  return (process.env.WC_API_BASE || "").replace(/\/$/, "");
}

function metaVal(order: any, key: string) {
  const hit = (order?.meta_data || []).find((m: any) => m.key === key);
  return hit ? String(hit.value || "") : "";
}

async function addOrderNote(
  base: string,
  auth: string,
  orderId: string,
  note: string,
  customerNote = false,
) {
  const res = await fetch(`${base}/wp-json/wc/v3/orders/${orderId}/notes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: auth },
    body: JSON.stringify({ note, customer_note: customerNote }),
  });
  return res.ok;
}

export function verifyEcpayMac(data: Record<string, string>) {
  const hashKey = (process.env.ECPAY_HASH_KEY || "").trim();
  const hashIv = (process.env.ECPAY_HASH_IV || "").trim();
  if (!hashKey || !hashIv) return false;
  const received = data.CheckMacValue || "";
  const computed = generateCheckMacValue(data, hashKey, hashIv);
  return received === computed;
}

/**
 * 綠界 ATM/超商取號成功後寫入 Woo。
 * ATM／超商「訂單已建立｜請完成付款」依賴 customer_note:true 觸發 WC 顧客備註信。
 * 去重以 _hover_order_created_notice_sent 為準（勿僅因已有帳號 meta 就略過，避免備註失敗後永不再寄）。
 */
export async function saveEcpayPaymentInfo(data: Record<string, string>) {
  const orderId = data.CustomField1;
  const auth = basicAuth();
  const base = wcBase();
  if (!orderId || !auth || !base) {
    throw new Error("缺少訂單或 WooCommerce 設定");
  }

  const bankCode = data.BankCode || "";
  const vAccount = data.vAccount || "";
  const expireDate = data.ExpireDate || "";
  const paymentNo = data.PaymentNo || "";
  const isAtm = String(data.PaymentType || "").includes("ATM");
  const isCvs =
    String(data.PaymentType || "").includes("CVS") ||
    String(data.PaymentType || "").includes("BARCODE");

  const existingRes = await fetch(`${base}/wp-json/wc/v3/orders/${orderId}`, {
    headers: { Authorization: auth },
    cache: "no-store",
  });
  const existing = existingRes.ok ? await existingRes.json() : null;
  const noticeAlreadySent =
    metaVal(existing, "_hover_order_created_notice_sent") === "1";

  const metaData: { key: string; value: string }[] = [];
  let customerNote = "";

  if (isAtm) {
    metaData.push({ key: "_vAccount", value: vAccount });
    metaData.push({ key: "_BankCode", value: bankCode });
    metaData.push({ key: "_ExpireDate", value: expireDate });
    customerNote = `【轉帳資訊】銀行代碼: ${bankCode}，虛擬帳號: ${vAccount}，繳費期限: ${expireDate}`;
  } else if (isCvs) {
    metaData.push({ key: "_PaymentNo", value: paymentNo });
    metaData.push({ key: "_ExpireDate", value: expireDate });
    customerNote = `【超商代碼】繳費代碼: ${paymentNo}，繳費期限: ${expireDate}`;
  }

  if (metaData.length > 0) {
    const metaRes = await fetch(`${base}/wp-json/wc/v3/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({ meta_data: metaData }),
    });
    if (!metaRes.ok) {
      console.error(`❌ 訂單 #${orderId} 取號 meta 寫入失敗`, metaRes.status);
      await addOrderNote(
        base,
        auth,
        orderId,
        `❌ 綠界取號資訊寫入失敗（HTTP ${metaRes.status}），顧客可能未收到付款通知信`,
      );
      throw new Error(`取號 meta 寫入失敗: ${metaRes.status}`);
    }

    // 顧客備註 → WC「顧客備註」信 → snippet 覆蓋為「訂單已建立｜請完成付款」
    if (!noticeAlreadySent && customerNote) {
      const noteOk = await addOrderNote(
        base,
        auth,
        orderId,
        customerNote,
        true,
      );
      if (noteOk) {
        await fetch(`${base}/wp-json/wc/v3/orders/${orderId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: auth },
          body: JSON.stringify({
            meta_data: [
              { key: "_hover_order_created_notice_sent", value: "1" },
              {
                key: "_hover_order_created_notice_sent_at",
                value: new Date().toISOString(),
              },
            ],
          }),
        });
        await addOrderNote(
          base,
          auth,
          orderId,
          `HOVER：已觸發「訂單已建立｜請完成付款」通知（customer_note → ${
            existing?.billing?.email || "（訂單信箱）"
          }）`,
        );
      } else {
        console.error(`❌ 訂單 #${orderId} 顧客備註／確認信觸發失敗`);
        await addOrderNote(
          base,
          auth,
          orderId,
          "❌ 取號成功但顧客備註寫入失敗，訂單確認信可能未寄出。請至訂單後台「重新傳送」或手動補寄。",
        );
      }
    }
  }

  return {
    orderId,
    bankCode,
    vAccount,
    expireDate,
    amount: data.TradeAmt || data.CustomField3 || existing?.total || "",
  };
}
