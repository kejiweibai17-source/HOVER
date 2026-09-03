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

export function verifyEcpayMac(data: Record<string, string>) {
  const hashKey = (process.env.ECPAY_HASH_KEY || "").trim();
  const hashIv = (process.env.ECPAY_HASH_IV || "").trim();
  if (!hashKey || !hashIv) return false;
  const received = data.CheckMacValue || "";
  const computed = generateCheckMacValue(data, hashKey, hashIv);
  return received === computed;
}

/** 綠界 ATM/超商取號成功後寫入 Woo；ATM 以顧客備註觸發通知（snippet 覆蓋成第 4 封） */
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
  const alreadyHasAccount = Boolean(
    metaVal(existing, "_vAccount") || metaVal(existing, "_PaymentNo"),
  );

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
    await fetch(`${base}/wp-json/wc/v3/orders/${orderId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({ meta_data: metaData }),
    });

    // 顧客備註會觸發 WC「顧客備註」信 → snippet 覆蓋為第 4 封「訂單已建立｜請完成付款」
    if (!alreadyHasAccount && customerNote) {
      await fetch(`${base}/wp-json/wc/v3/orders/${orderId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: auth },
        body: JSON.stringify({ note: customerNote, customer_note: true }),
      });
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
