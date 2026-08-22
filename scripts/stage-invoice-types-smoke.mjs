#!/usr/bin/env node
/**
 * STAGE 發票四種方式煙測（雲端／手機載具／三聯／捐贈）
 * Usage: node scripts/stage-invoice-types-smoke.mjs
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
    const k = t.slice(0, i);
    let v = t.slice(i + 1);
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    )
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
  return Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]).toString(
    "base64",
  );
}
function aesDecryptFromBase64(base64Cipher, key, iv) {
  const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
  decipher.setAutoPadding(true);
  return Buffer.concat([
    decipher.update(Buffer.from(base64Cipher, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

const MerchantID = (process.env.ECPAY_INVOICE_MERCHANT_ID || "").trim();
const HashKey = (process.env.ECPAY_INVOICE_HASH_KEY || "").trim();
const HashIV = (process.env.ECPAY_INVOICE_HASH_IV || "").trim();
const url = "https://einvoice-stage.ecpay.com.tw/B2CInvoice/Issue";

const CARRIER = (process.argv[2] || "/75R6AEM").trim().toUpperCase();

const cases = [
  {
    name: "雲端電子發票",
    patch: { Print: "0", Donation: "0", CarrierType: "1", CarrierNum: "" },
  },
  {
    name: "手機載具",
    patch: {
      Print: "0",
      Donation: "0",
      CarrierType: "3",
      CarrierNum: CARRIER,
    },
  },
  {
    name: "捐贈發票",
    patch: {
      Print: "0",
      Donation: "1",
      LoveCode: "978",
      CarrierType: "",
      CarrierNum: "",
    },
  },
  {
    name: "三聯式發票",
    patch: {
      Print: "1",
      Donation: "0",
      CarrierType: "",
      CarrierNum: "",
      CustomerIdentifier: "10000009", // 通過統編檢查碼之測試用編號
      CustomerName: "測試公司股份有限公司",
      CustomerAddr: "台北市南港區園區街3之1號",
    },
  },
];

async function issue(label, patch) {
  const amount = 50;
  const dataObj = {
    MerchantID,
    RelateNumber: `INV${Date.now()}${Math.floor(Math.random() * 99)}`.slice(
      0,
      30,
    ),
    CustomerEmail: "hover-invoice-test@example.com",
    CustomerName: patch.CustomerName || "HOVER顧客",
    CustomerAddr: patch.CustomerAddr || "台灣",
    CustomerPhone: "0912345678",
    Print: patch.Print,
    Donation: patch.Donation,
    CarrierType: patch.CarrierType,
    CarrierNum: patch.CarrierNum || "",
    TaxType: "1",
    SalesAmount: amount,
    InvType: "07",
    vat: "1",
    Items: [
      {
        ItemSeq: 1,
        ItemName: "HOVER發票方式測試",
        ItemCount: 1,
        ItemWord: "式",
        ItemPrice: amount,
        ItemTaxType: "1",
        ItemAmount: amount,
        ItemRemark: label,
      },
    ],
  };
  if (patch.LoveCode) dataObj.LoveCode = patch.LoveCode;
  if (patch.CustomerIdentifier)
    dataObj.CustomerIdentifier = patch.CustomerIdentifier;

  const payload = {
    MerchantID,
    RqHeader: { Timestamp: Math.floor(Date.now() / 1000) },
    Data: aesEncryptToBase64(
      ecpayUrlEncode(JSON.stringify(dataObj)),
      HashKey,
      HashIV,
    ),
  };

  const res = await fetch(url, {
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
      inner = JSON.parse(
        ecpayUrlDecode(aesDecryptFromBase64(outer.Data, HashKey, HashIV)),
      );
    } catch (e) {
      return { ok: false, label, error: `decrypt: ${e.message}`, raw };
    }
  }
  const ok = outer.TransCode === 1 && inner?.RtnCode === 1;
  return {
    ok,
    label,
    RelateNumber: dataObj.RelateNumber,
    InvoiceNo: inner?.InvoiceNo,
    RtnCode: inner?.RtnCode,
    RtnMsg: inner?.RtnMsg,
    TransCode: outer.TransCode,
  };
}

console.log("STAGE invoice smoke", { MerchantID, carrier: CARRIER });
const results = [];
for (const c of cases) {
  // 稍微錯開 RelateNumber
  await new Promise((r) => setTimeout(r, 400));
  const r = await issue(c.name, c.patch);
  results.push(r);
  console.log(
    r.ok ? "✅" : "❌",
    r.label,
    r.ok
      ? `InvoiceNo=${r.InvoiceNo} Relate=${r.RelateNumber}`
      : `Rtn=${r.RtnCode} ${r.RtnMsg || r.error || ""}`,
  );
}

const failed = results.filter((r) => !r.ok);
process.exit(failed.length ? 1 : 0);
