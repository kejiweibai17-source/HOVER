#!/usr/bin/env node
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const line of fs.readFileSync(path.join(__dirname, "../.env.local"), "utf8").split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  let v = t.slice(i + 1);
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  process.env[t.slice(0, i)] = v;
}

const MerchantID = process.env.ECPAY_INVOICE_MERCHANT_ID;
const HashKey = process.env.ECPAY_INVOICE_HASH_KEY;
const HashIV = process.env.ECPAY_INVOICE_HASH_IV;
const BASE = "https://einvoice-stage.ecpay.com.tw";

function enc(s) {
  return encodeURIComponent(s).replace(/!/g,"%21").replace(/'/g,"%27").replace(/\(/g,"%28").replace(/\)/g,"%29").replace(/\*/g,"%2A").replace(/%20/g,"+");
}
function dec(s){ return decodeURIComponent(s.replace(/\+/g,"%20")); }
function aesE(p){ const c=crypto.createCipheriv("aes-128-cbc",HashKey,HashIV); return Buffer.concat([c.update(p,"utf8"),c.final()]).toString("base64"); }
function aesD(b){ const d=crypto.createDecipheriv("aes-128-cbc",HashKey,HashIV); return Buffer.concat([d.update(Buffer.from(b,"base64")),d.final()]).toString("utf8"); }
async function call(api, dataObj){
  const payload={ MerchantID, RqHeader:{ Timestamp: Math.floor(Date.now()/1000) }, Data: aesE(enc(JSON.stringify({ MerchantID, ...dataObj }))) };
  const res=await fetch(`${BASE}${api}`,{ method:"POST", headers:{ "Content-Type":"application/json" }, body: JSON.stringify(payload) });
  const outer=await res.json();
  let inner=null;
  if(outer.Data){ try{ inner=JSON.parse(dec(aesD(outer.Data))); }catch(e){ inner={error:e.message}; } }
  return { http:res.status, TransCode:outer.TransCode, inner };
}

const list = await call("/B2CInvoice/GetInvoiceWordSetting", { InvoiceYear: "115" });
const tracks = list.inner?.InvoiceInfo || [];
const candidates = tracks.filter((t) => t.InvoiceTerm === 4 && t.UseStatus === 1);
console.log(
  "unused term4",
  candidates.map((t) => ({
    TrackID: t.TrackID,
    Header: t.InvoiceHeader,
    Start: t.InvoiceStart,
    End: t.InvoiceEnd,
    ProductServiceId: t.ProductServiceId,
  })),
);

const results = [];
for (const t of candidates.slice(0, 5)) {
  const en = await call("/B2CInvoice/UpdateInvoiceWordStatus", {
    TrackID: String(t.TrackID),
    InvoiceStatus: 2, // 2 = 啟用
  });
  results.push({ track: t.TrackID, enable: en.inner });
}

const issue = await call("/B2CInvoice/Issue", {
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
  Items: [{ ItemSeq:1, ItemName:"測試商品", ItemCount:1, ItemWord:"式", ItemPrice:100, ItemTaxType:"1", ItemAmount:100, ItemRemark:"" }],
});

console.log(JSON.stringify({ enableResults: results, issue: issue.inner, issueTrans: issue.TransCode }, null, 2));
