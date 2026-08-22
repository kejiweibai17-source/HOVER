#!/usr/bin/env node
/**
 * STAGE 發票：查字軌 → 必要時新增 → 開立測試發票
 * 金鑰：2000132 / ejCk326UnaZWKisg / q9jcZX8Ib9LM8wYk
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function loadEnv(file) {
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let v = t.slice(i + 1);
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
      v = v.slice(1, -1);
    process.env[t.slice(0, i)] = v;
  }
}
loadEnv(path.join(__dirname, "../.env.local"));

const MerchantID = process.env.ECPAY_INVOICE_MERCHANT_ID;
const HashKey = process.env.ECPAY_INVOICE_HASH_KEY;
const HashIV = process.env.ECPAY_INVOICE_HASH_IV;
const BASE = "https://einvoice-stage.ecpay.com.tw";

function ecpayUrlEncode(str) {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A")
    .replace(/%20/g, "+");
}
function ecpayUrlDecode(str) {
  return decodeURIComponent(str.replace(/\+/g, "%20"));
}
function aesEnc(plain) {
  const c = crypto.createCipheriv("aes-128-cbc", HashKey, HashIV);
  return Buffer.concat([c.update(plain, "utf8"), c.final()]).toString("base64");
}
function aesDec(b64) {
  const d = crypto.createDecipheriv("aes-128-cbc", HashKey, HashIV);
  return Buffer.concat([
    d.update(Buffer.from(b64, "base64")),
    d.final(),
  ]).toString("utf8");
}

async function call(path, dataObj) {
  const payload = {
    MerchantID,
    RqHeader: { Timestamp: Math.floor(Date.now() / 1000) },
    Data: aesEnc(ecpayUrlEncode(JSON.stringify({ MerchantID, ...dataObj }))),
  };
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const raw = await res.text();
  let outer = {};
  try {
    outer = JSON.parse(raw);
  } catch {}
  let inner = null;
  if (outer.Data) {
    try {
      inner = JSON.parse(ecpayUrlDecode(aesDec(outer.Data)));
    } catch (e) {
      inner = { decryptError: e.message };
    }
  }
  return { http: res.status, outer, inner, raw: raw.slice(0, 400) };
}

// 2026/08 → 民國 115 年，期別 4（7-8 月）
const InvoiceYear = "115";
const InvoiceTerm = 4;

const out = { MerchantID, InvoiceYear, InvoiceTerm, steps: [] };

out.steps.push({
  name: "GetInvoiceWordSetting",
  ...(await call("/B2CInvoice/GetInvoiceWordSetting", {
    InvoiceYear,
  })),
});

out.steps.push({
  name: "AddInvoiceWordSetting",
  ...(await call("/B2CInvoice/AddInvoiceWordSetting", {
    InvoiceTerm,
    InvoiceYear,
    InvType: "07",
    InvoiceCategory: "1",
    InvoiceHeader: "AA",
    InvoiceStart: "10000000",
    InvoiceEnd: "10000049",
  })),
});

const trackId = out.steps.at(-1)?.inner?.TrackID;
if (trackId) {
  out.steps.push({
    name: "UpdateInvoiceWordStatus_enable",
    ...(await call("/B2CInvoice/UpdateInvoiceWordStatus", {
      TrackID: String(trackId),
      InvoiceStatus: 1,
    })),
  });
}

out.steps.push({
  name: "Issue",
  ...(await call("/B2CInvoice/Issue", {
    RelateNumber: `INVTEST${Date.now()}`.slice(0, 30),
    CustomerEmail: "hover-invoice-test@example.com",
    CustomerName: "HOVER顧客",
    Print: "0",
    Donation: "0",
    CarrierType: "1",
    CarrierNum: "",
    TaxType: "1",
    SalesAmount: 100,
    InvType: "07",
    vat: "1",
    Items: [
      {
        ItemSeq: 1,
        ItemName: "測試商品",
        ItemCount: 1,
        ItemWord: "式",
        ItemPrice: 100,
        ItemTaxType: "1",
        ItemAmount: 100,
        ItemRemark: "",
      },
    ],
  })),
});

console.log(JSON.stringify(out, null, 2));
