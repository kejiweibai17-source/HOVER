// scripts/ecpay-invoice.mjs
import crypto from "crypto";

function ecpayUrlEncode(str) {
  return encodeURIComponent(str).replace(/%[0-9A-F]{2}/g, (m) => m.toLowerCase());
}

function aesEncryptToBase64(plain, key, iv) {
  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
  cipher.setAutoPadding(true);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return enc.toString("base64");
}

export function getInvoiceIssueUrl() {
  return "https://einvoice.ecpay.com.tw/B2CInvoice/Issue";
}

export async function issueEcpayInvoice({ relateNumber, customerEmail, salesAmount, items }) {
  const MerchantID = process.env.ECPAY_INVOICE_MERCHANT_ID || "";
  const HashKey = process.env.ECPAY_INVOICE_HASH_KEY || "";
  const HashIV = process.env.ECPAY_INVOICE_HASH_IV || "";

  if (!MerchantID) throw new Error("ECPAY_INVOICE_MERCHANT_ID 未設定");
  if (!HashKey) throw new Error("ECPAY_INVOICE_HASH_KEY 未設定");
  if (!HashIV) throw new Error("ECPAY_INVOICE_HASH_IV 未設定");
  if (HashKey.length !== 16 || HashIV.length !== 16) {
    throw new Error("ECPAY_INVOICE_HASH_KEY / IV 長度必須為 16（AES-128）");
  }

  const sum = items.reduce((s, it) => s + Number(it.ItemAmount || 0), 0);
  if (sum !== Number(salesAmount)) {
    throw new Error(`SalesAmount(${salesAmount}) 必須等於 Items 合計(${sum})`);
  }

  const nowTs = Math.floor(Date.now() / 1000);

  const dataObj = {
    MerchantID,
    RelateNumber: relateNumber,
    CustomerEmail: customerEmail,

    Print: "0",
    Donation: "0",
    CarrierType: "",
    CarrierNum: "",

    TaxType: "1",
    SalesAmount: Number(salesAmount),
    InvType: "07",
    vat: "1",

    Items: items.map((it, idx) => ({
      ItemSeq: idx + 1,
      ItemName: it.ItemName,
      ItemCount: Number(it.ItemCount),
      ItemWord: it.ItemWord,
      ItemPrice: Number(it.ItemPrice),
      ItemTaxType: it.ItemTaxType || "1",
      ItemAmount: Number(it.ItemAmount),
      ItemRemark: it.ItemRemark || "",
    })),
  };

  const jsonStr = JSON.stringify(dataObj);
  const urlEncodedJson = ecpayUrlEncode(jsonStr);
  const base64Cipher = aesEncryptToBase64(urlEncodedJson, HashKey, HashIV);

  const payload = {
    MerchantID,
    RqHeader: { Timestamp: nowTs },
    Data: base64Cipher, // ✅ 不要 urlencode
  };

  const res = await fetch(getInvoiceIssueUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status} :: ${raw}`);

  let result = {};
  try { result = JSON.parse(raw); } catch {}
  return result;
}
