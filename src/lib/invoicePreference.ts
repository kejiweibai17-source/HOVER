/** 結帳／綠界發票共用驗證（無 Node crypto，可給 client 引用） */

export type InvoiceType = "cloud" | "carrier" | "triple" | "donate";

export type InvoicePreference = {
  type: InvoiceType;
  carrierCode?: string;
  companyName?: string;
  taxId?: string;
  loveCode?: string;
};

export const INVOICE_META = {
  type: "_hover_invoice_type",
  carrier: "_hover_invoice_carrier",
  title: "_hover_invoice_title",
  taxId: "_hover_invoice_tax_id",
  loveCode: "_hover_invoice_love_code",
} as const;

export function normalizeMobileCarrier(raw: string): string {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function isValidMobileCarrier(code: string): boolean {
  return /^\/[0-9A-Z+\-.]{7}$/.test(normalizeMobileCarrier(code));
}

export function isValidLoveCode(code: string): boolean {
  return /^\d{3,7}$/.test(String(code || "").trim());
}

/** 台灣統一編號（含檢查碼） */
export function isValidTwTaxId(raw: string): boolean {
  const id = String(raw || "").trim();
  if (!/^\d{8}$/.test(id)) return false;
  const weights = [1, 2, 1, 2, 1, 2, 1, 2];
  let sum = 0;
  for (let i = 0; i < 8; i++) {
    const n = Number(id[i]) * weights[i];
    sum += Math.floor(n / 10) + (n % 10);
  }
  return sum % 10 === 0;
}

export function validateInvoicePreference(
  inv: InvoicePreference | null | undefined,
): { ok: true; value: InvoicePreference } | { ok: false; message: string } {
  const type = (inv?.type || "cloud") as InvoiceType;
  if (!["cloud", "carrier", "triple", "donate"].includes(type)) {
    return { ok: false, message: "發票方式無效" };
  }

  if (type === "cloud") {
    return { ok: true, value: { type: "cloud" } };
  }

  if (type === "carrier") {
    const carrierCode = normalizeMobileCarrier(inv?.carrierCode || "");
    if (!isValidMobileCarrier(carrierCode)) {
      return {
        ok: false,
        message: "請輸入正確手機條碼（/ 開頭共 8 碼，例：/ABC+123）",
      };
    }
    return { ok: true, value: { type: "carrier", carrierCode } };
  }

  if (type === "triple") {
    const companyName = String(inv?.companyName || "").trim();
    const taxId = String(inv?.taxId || "").trim();
    if (!companyName) {
      return { ok: false, message: "請填寫發票抬頭" };
    }
    if (!isValidTwTaxId(taxId)) {
      return { ok: false, message: "請輸入正確的統一編號（8 碼）" };
    }
    return { ok: true, value: { type: "triple", companyName, taxId } };
  }

  const loveCode = String(inv?.loveCode || "").trim();
  if (!isValidLoveCode(loveCode)) {
    return { ok: false, message: "請輸入正確愛心碼（3～7 位數字）" };
  }
  return { ok: true, value: { type: "donate", loveCode } };
}

export function invoiceMetaEntries(inv: InvoicePreference) {
  const entries: { key: string; value: string }[] = [
    { key: INVOICE_META.type, value: inv.type },
  ];
  if (inv.carrierCode) {
    entries.push({ key: INVOICE_META.carrier, value: inv.carrierCode });
  }
  if (inv.companyName) {
    entries.push({ key: INVOICE_META.title, value: inv.companyName });
  }
  if (inv.taxId) {
    entries.push({ key: INVOICE_META.taxId, value: inv.taxId });
  }
  if (inv.loveCode) {
    entries.push({ key: INVOICE_META.loveCode, value: inv.loveCode });
  }
  return entries;
}

export function invoicePreferenceFromOrderMeta(
  meta: Array<{ key?: string; value?: unknown }> | undefined,
): InvoicePreference {
  const map: Record<string, string> = {};
  for (const m of meta || []) {
    if (m?.key != null) map[String(m.key)] = String(m.value ?? "");
  }
  const type = (map[INVOICE_META.type] || "cloud") as InvoiceType;
  return {
    type: ["cloud", "carrier", "triple", "donate"].includes(type)
      ? type
      : "cloud",
    carrierCode: map[INVOICE_META.carrier] || undefined,
    companyName: map[INVOICE_META.title] || undefined,
    taxId: map[INVOICE_META.taxId] || undefined,
    loveCode: map[INVOICE_META.loveCode] || undefined,
  };
}

/** 訂單明細／後台顯示用（對齊結帳選項文案） */
export function getInvoiceTypeLabel(type: string | null | undefined): string {
  switch (String(type || "").toLowerCase()) {
    case "carrier":
      return "手機載具";
    case "triple":
      return "三聯式發票";
    case "donate":
      return "捐贈發票";
    case "cloud":
      return "雲端電子發票";
    default:
      return "雲端電子發票";
  }
}

/** 訂單明細補充一行（載具／統編／愛心碼） */
export function getInvoiceTypeDetail(
  inv: InvoicePreference | null | undefined,
): string {
  if (!inv) return "";
  if (inv.type === "carrier" && inv.carrierCode) {
    return `載具：${inv.carrierCode}`;
  }
  if (inv.type === "triple") {
    const parts = [
      inv.companyName ? `抬頭：${inv.companyName}` : "",
      inv.taxId ? `統編：${inv.taxId}` : "",
    ].filter(Boolean);
    return parts.join("　");
  }
  if (inv.type === "donate" && inv.loveCode) {
    return `愛心碼：${inv.loveCode}`;
  }
  return "";
}
