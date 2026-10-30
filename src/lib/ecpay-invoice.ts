import crypto from "crypto";
import type { InvoicePreference } from "@/lib/invoicePreference";
import { normalizeMobileCarrier } from "@/lib/invoicePreference";
import { getEcpayInvoiceCredentials } from "@/lib/ecpayEnv";

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

function getInvoiceApiBase() {
  const { mode } = getEcpayInvoiceCredentials();
  return mode === "stage"
    ? "https://einvoice-stage.ecpay.com.tw"
    : "https://einvoice.ecpay.com.tw";
}

export function getInvoiceIssueUrl() {
  return `${getInvoiceApiBase()}/B2CInvoice/Issue`;
}

function getInvoiceNotifyUrl() {
  return `${getInvoiceApiBase()}/B2CInvoice/InvoiceNotify`;
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

export type IssueInvoiceResult = {
  invoiceNo: string;
  invoiceDate?: string;
  randomNumber?: string;
  relateNumber: string;
  notifySent: boolean;
  notifyError?: string;
};

async function postEncryptedInvoiceApi(
  url: string,
  dataObj: Record<string, unknown>,
) {
  const {
    merchantId: MerchantID,
    hashKey: HashKey,
    hashIv: HashIV,
  } = getEcpayInvoiceCredentials();

  if (!MerchantID || !HashKey || !HashIV) throw new Error("發票金鑰未設定");

  const payload = {
    MerchantID,
    RqHeader: { Timestamp: Math.floor(Date.now() / 1000) },
    Data: aesEncryptToBase64(
      ecpayUrlEncode(JSON.stringify({ ...dataObj, MerchantID })),
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
  let result: any = {};
  try {
    result = JSON.parse(raw);
  } catch {}

  if (!res.ok) throw new Error(`Invoice API HTTP ${res.status} :: ${raw}`);
  if (result?.TransCode !== 1) {
    throw new Error(
      `Invoice API 傳輸失敗 :: [${result?.TransCode}] ${result?.TransMsg || raw}`,
    );
  }

  if (!result.Data) throw new Error(`Invoice API 無 Data :: ${raw}`);

  const inner = JSON.parse(
    ecpayUrlDecode(aesDecryptFromBase64(result.Data, HashKey, HashIV)),
  );
  return inner as Record<string, any>;
}

/** 開立後補寄／強制寄「發票開立」Email（後台通知未開時仍可用） */
export async function notifyEcpayInvoiceOpen(input: {
  invoiceNo: string;
  customerEmail: string;
  customerPhone?: string;
}) {
  const email = String(input.customerEmail || "").trim();
  const phone = String(input.customerPhone || "").replace(/\s+/g, "");
  if (!email && !phone) throw new Error("發票通知需 Email 或手機");

  const dataObj: Record<string, string> = {
    InvoiceNo: String(input.invoiceNo).trim(),
    Notify: "E",
    InvoiceTag: "I",
    Notified: "C",
  };
  if (email) dataObj.NotifyMail = email;
  if (phone) dataObj.Phone = phone.slice(0, 20);

  const inner = await postEncryptedInvoiceApi(getInvoiceNotifyUrl(), dataObj);
  if (inner.RtnCode !== 1) {
    throw new Error(
      `綠界發票通知失敗: [${inner.RtnCode}] ${inner.RtnMsg || ""}`,
    );
  }
  return inner;
}

export async function issueEcpayInvoice(
  input: IssueInvoiceInput,
): Promise<IssueInvoiceResult> {
  const sum = input.items.reduce((s, it) => s + Number(it.ItemAmount), 0);
  if (sum !== Number(input.salesAmount)) {
    throw new Error("SalesAmount 必須等於 Items 合計");
  }

  const dataObj = buildIssueFields(input);
  const inner = await postEncryptedInvoiceApi(getInvoiceIssueUrl(), dataObj);

  console.log("🔍 [綠界發票真實回傳解密]:", inner);

  if (inner.RtnCode !== 1) {
    throw new Error(
      `綠界發票拒絕開立: [${inner.RtnCode}] ${inner.RtnMsg}`,
    );
  }

  const invoiceNo = String(inner.InvoiceNo || "").trim();
  if (!invoiceNo) throw new Error("綠界發票開立成功但未回傳 InvoiceNo");

  let notifySent = false;
  let notifyError: string | undefined;
  try {
    await notifyEcpayInvoiceOpen({
      invoiceNo,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
    });
    notifySent = true;
  } catch (e) {
    notifyError = e instanceof Error ? e.message : String(e);
    console.error("⚠️ 發票開立通知寄送失敗:", notifyError);
  }

  return {
    invoiceNo,
    invoiceDate: inner.InvoiceDate ? String(inner.InvoiceDate) : undefined,
    randomNumber: inner.RandomNumber
      ? String(inner.RandomNumber)
      : undefined,
    relateNumber: input.relateNumber,
    notifySent,
    notifyError,
  };
}
