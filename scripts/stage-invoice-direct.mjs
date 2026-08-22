#!/usr/bin/env node
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
    const k = t.slice(0, i);
    let v = t.slice(i + 1);
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
      v = v.slice(1, -1);
    process.env[k] = v;
  }
}
loadEnv(path.join(__dirname, "../.env.local"));

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
function aesEncryptToBase64(plain, key, iv) {
  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
  cipher.setAutoPadding(true);
  return Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]).toString("base64");
}
function aesDecryptFromBase64(base64Cipher, key, iv) {
  const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
  decipher.setAutoPadding(true);
  return Buffer.concat([
    decipher.update(Buffer.from(base64Cipher, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

const MerchantID = process.env.ECPAY_INVOICE_MERCHANT_ID;
const HashKey = process.env.ECPAY_INVOICE_HASH_KEY;
const HashIV = process.env.ECPAY_INVOICE_HASH_IV;
const url = "https://einvoice-stage.ecpay.com.tw/B2CInvoice/Issue";

console.log({
  MerchantID,
  HashKeyLen: HashKey?.length,
  HashIVLen: HashIV?.length,
  HashKey,
  HashIV,
});

const dataObj = {
  MerchantID,
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
};

const payload = {
  MerchantID,
  RqHeader: { Timestamp: Math.floor(Date.now() / 1000) },
  Data: aesEncryptToBase64(ecpayUrlEncode(JSON.stringify(dataObj)), HashKey, HashIV),
};

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
const raw = await res.text();
console.log("HTTP", res.status, raw);
try {
  const result = JSON.parse(raw);
  if (result.Data) {
    const inner = JSON.parse(ecpayUrlDecode(aesDecryptFromBase64(result.Data, HashKey, HashIV)));
    console.log("INNER", inner);
  }
} catch (e) {
  console.log("decrypt/parse skip", e.message);
}
