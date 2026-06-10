// scripts/test-ecpay-invoice.mjs
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { issueEcpayInvoice, getInvoiceIssueUrl } from "./ecpay-invoice.mjs";

// 讀 .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log("✅ 已載入 .env.local");
} else {
  console.warn("⚠️ 找不到 .env.local，將改用系統環境變數");
}

async function main() {
  const MerchantID = process.env.ECPAY_INVOICE_MERCHANT_ID || "";
  const HashKey = process.env.ECPAY_INVOICE_HASH_KEY || "";
  const HashIV = process.env.ECPAY_INVOICE_HASH_IV || "";

  console.log("➡️ 發票 API URL:", getInvoiceIssueUrl());
  console.log("ECPAY_INVOICE_MERCHANT_ID =", MerchantID ? MerchantID.slice(0, 4) + "****" : "");
  console.log("ECPAY_INVOICE_HASH_KEY =", HashKey ? HashKey.slice(0, 4) + "****" : "");
  console.log("ECPAY_INVOICE_HASH_IV =", HashIV ? HashIV.slice(0, 4) + "****" : "");

  console.log("key len=", HashKey.length);
  console.log("iv  len=", HashIV.length);
  console.log("key JSON =", JSON.stringify(HashKey));
  console.log("iv  JSON =", JSON.stringify(HashIV));

  const relateNumber = `INVTEST${Date.now()}`.slice(0, 30);
  const email = "bob112722761236tom@gmail.com";
  const amount = 100;

  const items = [
    { ItemName: "測試商品", ItemCount: 1, ItemWord: "式", ItemPrice: amount, ItemAmount: amount },
  ];

  console.log("🧾 測試參數：", { relateNumber, email, amount });

  const result = await issueEcpayInvoice({
    relateNumber,
    customerEmail: email,
    salesAmount: amount,
    items,
  });

  console.log("✅ API result:", result);

  if (result?.TransCode !== 1) {
    throw new Error(`Invoice API Failed: ${JSON.stringify(result)}`);
  }

  console.log("✅ DONE");
}

main().catch((e) => {
  console.error("❌ FAILED:", e);
  process.exit(1);
});
