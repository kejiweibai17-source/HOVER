/**
 * 第三方首次登入：僅綁定既有帳（手機＋密碼）；不可直接新建會員
 * 已登入會員綁定：可用目前 session，略過手機＋密碼
 */
import jwt from "jsonwebtoken";
import type { NextResponse } from "next/server";
import {
  type SocialProvider,
  findCustomerByEmail,
  findCustomerBySocialId,
  SOCIAL_ID_META,
  upsertSocialCustomer,
  wooAuthHeaders,
} from "@/lib/socialAccount";
import { getMemberSession } from "@/lib/memberSession";

const JWT_SECRET =
  process.env.RESET_TOKEN_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.JWT_SECRET ||
  "secret";

const BASE = () => (process.env.WC_API_BASE || "").replace(/\/$/, "");

export const SOCIAL_PENDING_COOKIE = "hover_social_pending";
const PENDING_MAX_AGE = 15 * 60; // 15 分鐘

export type SocialPendingPayload = {
  type: "social_pending";
  provider: SocialProvider;
  providerUserId: string;
  email: string;
  name?: string;
  picture?: string;
  emailVerified?: boolean;
  next?: string;
};

export function normalizeTwPhone(raw: string): string {
  return String(raw || "").replace(/\D/g, "");
}

export function isValidTwMobile(phone: string): boolean {
  return /^09\d{8}$/.test(normalizeTwPhone(phone));
}

function metaValue(
  customer: { meta_data?: Array<{ key?: string; value?: unknown }> } | null,
  key: string,
): string {
  const meta = Array.isArray(customer?.meta_data) ? customer!.meta_data! : [];
  const hit = meta.find((m) => m.key === key);
  return hit?.value != null ? String(hit.value) : "";
}

function phoneFromCustomer(customer: any): string {
  const billing = customer?.billing?.phone || "";
  const shipping = customer?.shipping?.phone || "";
  const metaPhone =
    metaValue(customer, "billing_phone") ||
    metaValue(customer, "_billing_phone") ||
    "";
  return normalizeTwPhone(billing || shipping || metaPhone || "");
}

export function getCustomerPhone(customer: any): string {
  return phoneFromCustomer(customer);
}

/** 以手機反查會員（billing.phone 或 username＝手機） */
export async function findCustomerByPhone(phone: string) {
  const list = await findCustomersByPhone(phone);
  return list[0] || null;
}

/** 同一手機可能對到多筆舊帳（防重複領禮） */
export async function findCustomersByPhone(
  phone: string,
): Promise<Array<Record<string, unknown>>> {
  const headers = wooAuthHeaders();
  if (!headers || !BASE()) return [];
  const target = normalizeTwPhone(phone);
  if (!isValidTwMobile(target)) return [];

  const hits: Array<Record<string, unknown>> = [];
  for (let page = 1; page <= 8; page++) {
    const res = await fetch(
      `${BASE()}/wp-json/wc/v3/customers?per_page=100&page=${page}&role=all&orderby=registered_date&order=desc`,
      { headers, cache: "no-store" },
    );
    if (!res.ok) break;
    const arr = (await res.json().catch(() => [])) as any[];
    if (!Array.isArray(arr) || arr.length === 0) break;
    for (const c of arr) {
      if (phoneFromCustomer(c) === target) {
        hits.push(c as Record<string, unknown>);
        continue;
      }
      const username = normalizeTwPhone(String(c?.username || ""));
      if (username === target) hits.push(c as Record<string, unknown>);
    }
    if (arr.length < 100) break;
  }
  return hits;
}

export function signSocialPending(
  payload: Omit<SocialPendingPayload, "type">,
): string {
  return jwt.sign(
    { ...payload, type: "social_pending" as const },
    JWT_SECRET,
    { expiresIn: PENDING_MAX_AGE },
  );
}

export function verifySocialPending(token: string): SocialPendingPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as SocialPendingPayload;
    if (decoded?.type !== "social_pending") return null;
    if (!decoded.provider || !decoded.providerUserId) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function socialPendingCookieOpts(maxAge = PENDING_MAX_AGE) {
  const isProd = process.env.NODE_ENV === "production";
  const domain = process.env.COOKIE_DOMAIN || undefined;
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    maxAge,
    ...(domain ? { domain } : {}),
  };
}

export function setSocialPendingCookie(res: NextResponse, token: string) {
  res.cookies.set(SOCIAL_PENDING_COOKIE, token, socialPendingCookieOpts());
}

export function clearSocialPendingCookie(res: NextResponse) {
  res.cookies.set(SOCIAL_PENDING_COOKIE, "", {
    ...socialPendingCookieOpts(0),
    maxAge: 0,
  });
}

/**
 * 社群登入是否已綁定：
 * - 僅在已寫入社群 ID meta 時視為 existing（可直接登入）
 * - Email 相同仍不算綁定：第一次第三方登入必須走手機＋密碼驗證綁定
 */
export async function resolveSocialAccount(input: {
  provider: SocialProvider;
  providerUserId: string;
  email?: string;
}): Promise<
  | { status: "existing"; customer: Record<string, unknown> }
  | { status: "pending" }
> {
  const providerUserId = String(input.providerUserId || "").trim();
  if (!providerUserId) return { status: "pending" };

  const bySocial = await findCustomerBySocialId(input.provider, providerUserId);
  if (bySocial?.id) {
    return { status: "existing", customer: bySocial };
  }

  return { status: "pending" };
}

export function linkAccountPath(nextPath?: string): string {
  const next = String(nextPath || "/account").trim() || "/account";
  const safe = next.startsWith("/") ? next : "/account";
  return `/auth/link-account?next=${encodeURIComponent(safe)}`;
}

/** 將社群綁到指定既有顧客 */
export async function bindSocialToCustomer(params: {
  customerId: number;
  provider: SocialProvider;
  providerUserId: string;
  name?: string;
  picture?: string;
  emailVerified?: boolean;
}) {
  const headers = wooAuthHeaders();
  if (!headers || !BASE()) throw new Error("woo_config_missing");

  const meta: Array<{ key: string; value: string }> = [
    { key: SOCIAL_ID_META[params.provider], value: params.providerUserId },
    { key: "oauth_provider", value: params.provider },
    { key: "oauth_last_login_at", value: new Date().toISOString() },
  ];
  if (params.emailVerified) {
    meta.push({ key: "email_verified", value: "1" });
  }
  if (params.picture) meta.push({ key: "avatar_url", value: params.picture });
  if (params.name) meta.push({ key: "oauth_display_name", value: params.name });

  const upd = await fetch(`${BASE()}/wp-json/wc/v3/customers/${params.customerId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ meta_data: meta }),
    cache: "no-store",
  });
  if (!upd.ok) {
    const err = await upd.text().catch(() => "");
    throw new Error(`bind_failed:${err.slice(0, 200)}`);
  }
  return upd.json();
}

/** 目前登入會員的 Woo customer ID（含僅有 email 的 Google session） */
export async function resolveSessionCustomerId(): Promise<number | null> {
  const session = await getMemberSession();
  if (!session) return null;
  if (session.customerId > 0) return session.customerId;
  const email = String(session.email || "").trim().toLowerCase();
  if (!email) return null;
  const customer = await findCustomerByEmail(email);
  const id = Number(customer?.id || 0);
  return id > 0 ? id : null;
}

export type BindSocialResult =
  | { ok: true; customerId: number; already?: boolean }
  | { ok: false; code: string; message: string };

/**
 * 已登入會員綁定社群：略過手機＋密碼。
 * 若此社群 ID 已綁其他帳號則拒絕。
 */
export async function bindSocialToLoggedInCustomer(params: {
  customerId: number;
  provider: SocialProvider;
  providerUserId: string;
  name?: string;
  picture?: string;
  emailVerified?: boolean;
}): Promise<BindSocialResult> {
  const customerId = Number(params.customerId);
  const providerUserId = String(params.providerUserId || "").trim();
  if (!customerId || !providerUserId) {
    return {
      ok: false,
      code: "invalid",
      message: "無法確認會員或社群帳號",
    };
  }

  const existing = await findCustomerBySocialId(params.provider, providerUserId);
  const existingId = Number(existing?.id || 0);
  if (existingId && existingId !== customerId) {
    return {
      ok: false,
      code: "social_taken",
      message: "此社群帳號已綁定其他 HOVER 會員，請改用該帳號登入",
    };
  }
  if (existingId === customerId) {
    return { ok: true, customerId, already: true };
  }

  await bindSocialToCustomer({
    customerId,
    provider: params.provider,
    providerUserId,
    name: params.name,
    picture: params.picture,
    emailVerified: params.emailVerified,
  });
  return { ok: true, customerId };
}

export { upsertSocialCustomer };
