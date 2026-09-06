/**
 * 優惠資格以手機為準：
 * - 入會禮：同一手機限一次
 * - 生日禮：同一手機同一年度限一次
 */
import {
  findCustomersByPhone,
  getCustomerPhone,
  isValidTwMobile,
  normalizeTwPhone,
} from "@/lib/socialLink";
import { HOVER_MEMBERSHIP_META } from "@/lib/membership";

export const PHONE_GIFT_META = {
  /** 綁在會員身上，方便查詢／除錯 */
  welcomePhone: "hover_welcome_phone",
  birthdayYearPrefix: "hover_birthday_claim_year_",
  birthdayUsedYearPrefix: "hover_birthday_used_year_",
} as const;

function metaVal(
  meta: Array<{ key?: string; value?: unknown }> | undefined,
  key: string,
): string {
  if (!Array.isArray(meta)) return "";
  const row = meta.find((m) => m.key === key);
  return row?.value != null ? String(row.value) : "";
}

export function birthdayClaimYearKey(year: number): string {
  return `${PHONE_GIFT_META.birthdayYearPrefix}${year}`;
}

export function birthdayUsedYearKey(year: number): string {
  return `${PHONE_GIFT_META.birthdayUsedYearPrefix}${year}`;
}

function customerMeta(
  customer: Record<string, unknown>,
): Array<{ key?: string; value?: unknown }> {
  return Array.isArray(customer.meta_data)
    ? (customer.meta_data as Array<{ key?: string; value?: unknown }>)
    : [];
}

export function metaHasWelcomeClaim(
  meta: Array<{ key?: string; value?: unknown }> | undefined,
): boolean {
  return metaVal(meta, HOVER_MEMBERSHIP_META.welcomeClaimed) === "1";
}

export function metaHasBirthdayYearClaim(
  meta: Array<{ key?: string; value?: unknown }> | undefined,
  year: number,
): boolean {
  if (metaVal(meta, birthdayClaimYearKey(year)) === "1") return true;
  // 相容舊版：同年任一月份 claim
  if (!Array.isArray(meta)) return false;
  const prefix = `hover_birthday_claim_${year}_`;
  return meta.some(
    (m) => String(m.key || "").startsWith(prefix) && String(m.value) === "1",
  );
}

export function metaHasBirthdayYearUsed(
  meta: Array<{ key?: string; value?: unknown }> | undefined,
  year: number,
): boolean {
  if (metaVal(meta, birthdayUsedYearKey(year)) === "1") return true;
  if (!Array.isArray(meta)) return false;
  const prefix = `hover_birthday_used_${year}_`;
  return meta.some(
    (m) => String(m.key || "").startsWith(prefix) && String(m.value) === "1",
  );
}

/**
 * 同一手機是否已領過入會禮（含其他舊帳號）
 */
export async function phoneHasWelcomeGift(
  phoneRaw: string,
  excludeCustomerId?: number,
): Promise<boolean> {
  const phone = normalizeTwPhone(phoneRaw);
  if (!isValidTwMobile(phone)) return false;
  const customers = await findCustomersByPhone(phone);
  for (const c of customers) {
    const id = Number(c.id || 0);
    if (excludeCustomerId && id === excludeCustomerId) {
      // 仍要看自己是否已領
    }
    if (metaHasWelcomeClaim(customerMeta(c))) return true;
  }
  return false;
}

/**
 * 同一手機該年度是否已領過生日禮
 */
export async function phoneHasBirthdayGiftYear(
  phoneRaw: string,
  year: number,
  _excludeCustomerId?: number,
): Promise<boolean> {
  const phone = normalizeTwPhone(phoneRaw);
  if (!isValidTwMobile(phone)) return false;
  const customers = await findCustomersByPhone(phone);
  for (const c of customers) {
    if (metaHasBirthdayYearClaim(customerMeta(c), year)) return true;
  }
  return false;
}

export async function resolveCustomerPhone(
  customerId: number,
  existing?: {
    billing?: { phone?: string };
    meta_data?: Array<{ key?: string; value?: unknown }>;
  } | null,
): Promise<string> {
  if (existing) {
    const p = getCustomerPhone(existing);
    if (isValidTwMobile(p)) return p;
  }
  const base = (process.env.WC_API_BASE || "").replace(/\/$/, "");
  const ck = process.env.WC_CONSUMER_KEY || "";
  const cs = process.env.WC_CONSUMER_SECRET || "";
  if (!base || !ck || !cs || !customerId) return "";
  const auth = "Basic " + Buffer.from(`${ck}:${cs}`).toString("base64");
  const res = await fetch(`${base}/wp-json/wc/v3/customers/${customerId}`, {
    headers: { Authorization: auth },
    cache: "no-store",
  });
  if (!res.ok) return "";
  const user = await res.json().catch(() => null);
  return getCustomerPhone(user);
}
