#!/usr/bin/env node
/**
 * HOVER stage smoke test:
 * 1) checkout ATM + 7-11 C2C
 * 2) simulate ATM take-number → thank-you payment_info
 * 3) simulate paid callback → ecpay stage invoice
 * 4) verify /api/orders + thank-you query params
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv(file) {
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i);
    let v = t.slice(i + 1);
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadEnv(path.join(__dirname, "../.env.local"));

function generateCheckMacValue(params, hashKey, hashIV) {
  const keys = Object.keys(params)
    .filter((k) => k !== "CheckMacValue")
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase(), "en"));
  let rawString = `HashKey=${hashKey}`;
  keys.forEach((k) => {
    rawString += `&${k}=${params[k]}`;
  });
  rawString += `&HashIV=${hashIV}`;
  let encodedString = encodeURIComponent(rawString).toLowerCase();
  encodedString = encodedString
    .replace(/%2d/g, "-")
    .replace(/%5f/g, "_")
    .replace(/%2e/g, ".")
    .replace(/%21/g, "!")
    .replace(/%2a/g, "*")
    .replace(/%28/g, "(")
    .replace(/%29/g, ")")
    .replace(/%20/g, "+");
  return crypto.createHash("sha256").update(encodedString).digest("hex").toUpperCase();
}

async function main() {
  const SITE = process.env.SMOKE_SITE || "http://localhost:3000";
  const HASH_KEY = process.env.ECPAY_HASH_KEY;
  const HASH_IV = process.env.ECPAY_HASH_IV;
  const out = { steps: [] };

  // 1) checkout
  const checkoutRes = await fetch(`${SITE}/api/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: [
        {
          wcProductId: 1273,
          wcVariationId: 1276,
          qty: 1,
          price: 1380,
          title: "經典帆布托特包",
          name: "經典帆布托特包",
          id: 1273,
        },
      ],
      contact: { email: "hover-invoice-test@example.com" },
      addr: {
        firstName: "騰樂",
        lastName: "黃",
        line1: "",
        phone: "0912345678",
        storeId: "131386",
        storeName: "7-ELEVEN 測試門市",
        storeAddr: "綠界官方固定測試門市",
      },
      total: 1465,
      shipMethod: "711",
      payMethod: "atm",
      memberDiscount: 0,
    }),
  });
  const checkoutRaw = await checkoutRes.text();
  let checkout;
  try {
    checkout = JSON.parse(checkoutRaw);
  } catch {
    out.steps.push({
      step: "checkout",
      ok: false,
      http: checkoutRes.status,
      body: checkoutRaw.slice(0, 500),
    });
    console.log(JSON.stringify(out, null, 2));
    process.exit(1);
  }
  out.steps.push({
    step: "checkout",
    ok: checkout.ok === true,
    orderId: checkout.orderId,
    message: checkout.message,
    paymentUrlInHtml: String(checkout.html || "").includes("payment-stage.ecpay.com.tw"),
    merchantInHtml: String(checkout.html || "").includes(`value="${process.env.ECPAY_MERCHANT_ID}"`),
    mapMerchantPublic: process.env.NEXT_PUBLIC_ECPAY_MERCHANT_ID,
  });
  if (!checkout.ok) {
    console.log(JSON.stringify(out, null, 2));
    process.exit(1);
  }
  const orderId = String(checkout.orderId);
  const tradeNoMatch = String(checkout.html || "").match(
    /name="MerchantTradeNo" value="([^"]+)"/,
  );
  const merchantTradeNo = tradeNoMatch ? tradeNoMatch[1] : `H${Date.now()}`;

  // 2) ATM take-number (RtnCode 2) → thank-you
  const atmParams = {
    MerchantID: process.env.ECPAY_MERCHANT_ID,
    MerchantTradeNo: merchantTradeNo,
    StoreID: "",
    RtnCode: "2",
    RtnMsg: "Get VirtualAccount Succeeded",
    TradeNo: `STAGE${Date.now()}`,
    TradeAmt: "1465",
    PaymentType: "ATM_LAND",
    PaymentTypeChargeFee: "0",
    TradeDate: "2026/08/20 20:10:00",
    BankCode: "812",
    vAccount: "123456789012",
    ExpireDate: "2026/08/23",
    CustomField1: orderId,
    CustomField2: "hover-invoice-test@example.com",
    CustomField3: "1465",
    CustomField4: "",
  };
  atmParams.CheckMacValue = generateCheckMacValue(atmParams, HASH_KEY, HASH_IV);
  const atmBody = new URLSearchParams(atmParams);
  const atmRes = await fetch(`${SITE}/api/ecpay/atm-return`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: atmBody.toString(),
    redirect: "manual",
  });
  const location = atmRes.headers.get("location") || "";
  out.steps.push({
    step: "atm_take_number",
    status: atmRes.status,
    redirect: location,
    thankYouOk:
      location.includes(`/thank-you?orderId=${orderId}`) ||
      location.includes(`/thank-you?orderId=${encodeURIComponent(orderId)}`),
  });

  // wait meta write
  await new Promise((r) => setTimeout(r, 1200));
  const orderApi1Res = await fetch(`${SITE}/api/orders/${orderId}`, {
    cache: "no-store",
  });
  const orderApi1Raw = await orderApi1Res.text();
  let orderApi1;
  try {
    orderApi1 = JSON.parse(orderApi1Raw);
  } catch {
    out.steps.push({
      step: "thank_you_order_api_after_atm",
      ok: false,
      http: orderApi1Res.status,
      body: orderApi1Raw.slice(0, 500),
    });
    console.log(JSON.stringify(out, null, 2));
    process.exit(1);
  }
  out.steps.push({
    step: "thank_you_order_api_after_atm",
    status: orderApi1.status,
    statusChinese: orderApi1.statusChinese,
    total: orderApi1.total,
    payment_info: orderApi1.payment_info,
    hasAtmAccount: Boolean(orderApi1.payment_info?.atm_account),
  });

  // 3) payment success → invoice
  const payParams = {
    MerchantID: process.env.ECPAY_MERCHANT_ID,
    MerchantTradeNo: merchantTradeNo,
    StoreID: "",
    RtnCode: "1",
    RtnMsg: "交易成功",
    TradeNo: `PAID${Date.now()}`,
    TradeAmt: "1465",
    PaymentType: "ATM_LAND",
    PaymentDate: "2026/08/20 20:12:00",
    PaymentTypeChargeFee: "0",
    TradeDate: "2026/08/20 20:10:00",
    SimulatePaid: "1",
    CustomField1: orderId,
    CustomField2: "hover-invoice-test@example.com",
    CustomField3: "1465",
    CustomField4: "",
  };
  payParams.CheckMacValue = generateCheckMacValue(payParams, HASH_KEY, HASH_IV);
  const payRes = await fetch(`${SITE}/api/ecpay/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(payParams).toString(),
  });
  const payText = await payRes.text();
  out.steps.push({
    step: "payment_callback",
    http: payRes.status,
    body: payText,
  });

  await new Promise((r) => setTimeout(r, 2000));
  const orderApi2 = await fetch(`${SITE}/api/orders/${orderId}`, {
    cache: "no-store",
  }).then((r) => r.json());
  out.steps.push({
    step: "thank_you_order_api_after_paid",
    status: orderApi2.status,
    statusChinese: orderApi2.statusChinese,
    total: orderApi2.total,
    payment_info: orderApi2.payment_info,
  });

  // Woo notes for invoice evidence
  const BASE = process.env.WC_API_BASE.replace(/\/$/, "");
  const auth =
    "Basic " +
    Buffer.from(
      `${process.env.WC_CONSUMER_KEY}:${process.env.WC_CONSUMER_SECRET}`,
    ).toString("base64");
  const notes = await fetch(
    `${BASE}/wp-json/wc/v3/orders/${orderId}/notes?per_page=20`,
    { headers: { Authorization: auth } },
  ).then((r) => r.json());
  out.steps.push({
    step: "order_notes",
    notes: (notes || []).map((n) => n.note).slice(0, 8),
  });

  out.env = {
    invoiceEnv: process.env.ECPAY_INVOICE_ENV,
    invoiceMerchant: process.env.ECPAY_INVOICE_MERCHANT_ID,
    paymentMerchant: process.env.ECPAY_MERCHANT_ID,
    invoiceUrlHint:
      process.env.ECPAY_INVOICE_ENV === "stage"
        ? "einvoice-stage.ecpay.com.tw"
        : "einvoice.ecpay.com.tw",
  };

  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
