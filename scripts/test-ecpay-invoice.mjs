// scripts/test-ecpay-invoice.mjs
import { issueEcpayInvoice, getInvoiceIssueUrl } from "./ecpay-invoice.mjs";

async function main() {
  const MerchantID = (
    process.env.ECPAY_INVOICE_MERCHANT_ID ||
    process.env.ECPAY_MERCHANT_ID ||
    ""
  ).trim();
  const HashKey = (
    process.env.ECPAY_INVOICE_HASH_KEY ||
    process.env.ECPAY_HASH_KEY ||
    ""
  ).trim();
  const HashIV = (
    process.env.ECPAY_INVOICE_HASH_IV ||
    process.env.ECPAY_HASH_IV ||
    ""
  ).trim();

  console.log("➡️ 發票 API URL:", getInvoiceIssueUrl());
  console.log("MerchantID prefix =", MerchantID.slice(0, 4) + "****");
  console.log("key len=", HashKey.length, "iv len=", HashIV.length);

  const relateNumber = `INVTEST${Date.now()}`.slice(0, 30);
  const email =
    process.env.TEST_INVOICE_EMAIL ||
    process.env.SMTP_USER ||
    "";
  const amount = Number(process.env.TEST_INVOICE_AMOUNT || 100);

  if (!email) throw new Error("請設定 TEST_INVOICE_EMAIL 或 SMTP_USER");

  const items = [
    {
      ItemName: "電子發票連線測試",
      ItemCount: 1,
      ItemWord: "式",
      ItemPrice: amount,
      ItemAmount: amount,
    },
  ];

  console.log("🧾 測試參數：", { relateNumber, email, amount });

  const result = await issueEcpayInvoice({
    relateNumber,
    customerEmail: email,
    salesAmount: amount,
    items,
  });

  console.log("✅ 開立成功");
  console.log("InvoiceNo:", result.inner?.InvoiceNo || "");
  console.log("RtnMsg:", result.inner?.RtnMsg || "");
  console.log("RandomNumber:", result.inner?.RandomNumber || "");
}

main().catch((e) => {
  console.error("❌ FAILED:", e.message || e);
  process.exit(1);
});
