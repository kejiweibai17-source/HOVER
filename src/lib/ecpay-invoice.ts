import crypto from "crypto";
import type { InvoicePreference } from "@/lib/invoicePreference";
import { normalizeMobileCarrier } from "@/lib/invoicePreference";

export type {
  InvoiceType,
  InvoicePreference,
} from "@/lib/invoicePreference";
export {
  INVOICE_META,
  normalizeMobileCarrier,
  isValidMobileCarrier,
  isValidLoveCode,
  isValidTwTaxId,
  validateInvoicePreference,
  invoiceMetaEntries,
  invoicePreferenceFromOrderMeta,
} from "@/lib/invoicePreference";

// 精準模擬 PHP 的 urlencode 行為，綠界發票專用
function ecpayUrlEncode(str: string) {
  return encodeURIComponent(str)
    .replace(/!/g, "%21")
    .replace(/'/g, "%27")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29")
    .replace(/\*/g, "%2A")
    .replace(/%20/g, "+");
}

function ecpayUrlDecode(str: string) {
  return decodeURIComponent(str.replace(/\+/g, "%20"));
}

function aesEncryptToBase64(plain: string, key: string, iv: string) {
  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
  cipher.setAutoPadding(true);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return enc.toString("base64");
}

function aesDecryptFromBase64(base64Cipher: string, key: string, iv: string) {
  const decipher = crypto.createDecipheriv("aes-128-cbc", key, iv);
  decipher.setAutoPadding(true);
  const dec = Buffer.concat([
    decipher.update(Buffer.from(base64Cipher, "base64")),
    decipher.final(),
  ]);
  return dec.toString("utf8");
}

export function getInvoiceIssueUrl() {
  const env = (
    process.env.ECPAY_INVOICE_ENV ||
    process.env.ECPAY_ENV ||
    ""
  )
    .trim()
    .toLowerCase();
  const useStage = env === "stage" || env === "test" || env === "sandbox";
  return useStage
    ? "https://einvoice-stage.ecpay.com.tw/B2CInvoice/Issue"
    : "https://einvoice.ecpay.com.tw/B2CInvoice/Issue";
}

export type InvoiceIssueItem = {
  ItemName: string;
  ItemCount: number;
  ItemWord: string;
  ItemPrice: number;
  ItemAmount: number;
  ItemTaxType?: string;
  ItemRemark?: string;
};

export type IssueInvoiceInput = {
  relateNumber: string;
  customerEmail: string;
  salesAmount: number;
  items: InvoiceIssueItem[];
  customerName?: string;
  customerPhone?: string;
  customerAddr?: string;
  invoice?: InvoicePreference;
};

function buildIssueFields(
  input: IssueInvoiceInput,
): Record<string, string | number | object> {
  const inv = input.invoice || { type: "cloud" as const };
  const email = String(input.customerEmail || "").trim();
  const phone = String(input.customerPhone || "").replace(/\s+/g, "");
  const addr = String(input.customerAddr || "").trim() || "不提供實體地址";
  const fallbackName =
    String(input.customerName || "HOVER顧客").trim() || "HOVER顧客";

  let Print = "0";
  let Donation = "0";
  let LoveCode = "";
  let CarrierType = "1";
  let CarrierNum = "";
  let CustomerIdentifier = "";
  let CustomerName = fallbackName.slice(0, 60);
  let CustomerAddr = addr.slice(0, 100);

  if (inv.type === "carrier") {
    CarrierType = "3";
    CarrierNum = normalizeMobileCarrier(inv.carrierCode || "");
    Print = "0";
    Donation = "0";
  } else if (inv.type === "triple") {
    CustomerIdentifier = String(inv.taxId || "").trim();
    CustomerName = String(inv.companyName || fallbackName).trim().slice(0, 60);
    Print = "1";
    Donation = "0";
    CarrierType = "";
    CarrierNum = "";
    if (CustomerAddr.length < 6) {
      CustomerAddr = "台灣";
    }
  } else if (inv.type === "donate") {
    Donation = "1";
    LoveCode = String(inv.loveCode || "").trim();
    Print = "0";
    CarrierType = "";
    CarrierNum = "";
    CustomerIdentifier = "";
  }

  const dataObj: Record<string, unknown> = {
    MerchantID: "",
    RelateNumber: input.relateNumber,
    CustomerName,
    CustomerAddr,
    CustomerEmail: email,
    Print,
    Donation,
    CarrierType,
    CarrierNum,
    TaxType: "1",
    SalesAmount: Number(input.salesAmount),
    InvType: "07",
    vat: "1",
    Items: input.items.map((it, idx) => ({
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

  if (phone) dataObj.CustomerPhone = phone.slice(0, 20);
  if (CustomerIdentifier) dataObj.CustomerIdentifier = CustomerIdentifier;
  if (Donation === "1" && LoveCode) dataObj.LoveCode = LoveCode;

  return dataObj as Record<string, string | number | object>;
}

export async function issueEcpayInvoice(input: IssueInvoiceInput) {
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

  if (!MerchantID || !HashKey || !HashIV) throw new Error("發票金鑰未設定");

  const sum = input.items.reduce((s, it) => s + Number(it.ItemAmount), 0);
  if (sum !== Number(input.salesAmount)) {
    throw new Error("SalesAmount 必須等於 Items 合計");
  }

  const nowTs = Math.floor(Date.now() / 1000);
  const dataObj = buildIssueFields(input);
  dataObj.MerchantID = MerchantID;

  const jsonStr = JSON.stringify(dataObj);
  const urlEncodedJson = ecpayUrlEncode(jsonStr);
  const base64Cipher = aesEncryptToBase64(urlEncodedJson, HashKey, HashIV);

  const payload = {
    MerchantID,
    RqHeader: { Timestamp: nowTs },
    Data: base64Cipher,
  };

  const res = await fetch(getInvoiceIssueUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  let result: any = {};
  try {
    result = JSON.parse(raw);
  } catch {}

  if (!res.ok) throw new Error(`Invoice API HTTP ${res.status} :: ${raw}`);
  if (result?.TransCode !== 1) throw new Error(`Invoice API 傳輸失敗 :: ${raw}`);

  if (result.Data) {
    try {
      const decryptedStr = aesDecryptFromBase64(result.Data, HashKey, HashIV);
      const decodedJsonStr = ecpayUrlDecode(decryptedStr);
      const innerResult = JSON.parse(decodedJsonStr);

      console.log("🔍 [綠界發票真實回傳解密]:", innerResult);

      if (innerResult.RtnCode !== 1) {
        throw new Error(
          `綠界發票拒絕開立: [${innerResult.RtnCode}] ${innerResult.RtnMsg}`,
        );
      }
    } catch (decErr: any) {
      if (String(decErr?.message || "").includes("綠界發票拒絕開立")) {
        throw decErr;
      }
      console.error("發票 Data 解密發生異常:", decErr);
    }
  }

  return result;
}
