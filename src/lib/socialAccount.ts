/**
 * 社群帳號合併／Session 排他 — 對齊常見國際電商做法：
 * 1. 同一「已驗證 email」合併為同一顧客
 * 2. 可同時綁定多個社群 ID，不互相覆蓋刪除
 * 3. 虛擬 email（未授權真實信箱）不與真實 email 合併
 * 4. 每次登入只保留一種作用中 session（NextAuth 或 auth_token）
 */

import type { NextResponse } from "next/server";
import { cookies } from "next/headers";

export type SocialProvider = "google" | "facebook" | "line";

export const SOCIAL_ID_META: Record<SocialProvider, string> = {
  google: "social_login_google_id",
  facebook: "social_login_facebook_id",
  line: "social_login_line_id",
};

export const AUTH_METHOD_COOKIE = "hover_auth_method";
export const SYNTHETIC_EMAIL_DOMAIN = "users.hover.local";

const BASE = () => (process.env.WC_API_BASE || "").replace(/\/$/, "");
const CK = () => process.env.WC_CONSUMER_KEY || "";
const CS = () => process.env.WC_CONSUMER_SECRET || "";

function basicAuthHeader(): string | null {
  if (!CK() || !CS()) return null;
  return "Basic " + Buffer.from(`${CK()}:${CS()}`).toString("base64");
}

export function wooAuthHeaders(): Record<string, string> | null {
  const auth = basicAuthHeader();
  if (!auth) return null;
  return { Authorization: auth, "Content-Type": "application/json" };
}

export function isSyntheticSocialEmail(email: string): boolean {
  const e = String(email || "").trim().toLowerCase();
  return e.endsWith(`@${SYNTHETIC_EMAIL_DOMAIN}`);
}

export function isUsableSocialEmail(email: string | null | undefined): boolean {
  const e = String(email || "").trim().toLowerCase();
  if (!e || !e.includes("@")) return false;
  if (isSyntheticSocialEmail(e)) return false;
  return true;
}

function metaValue(
  customer: { meta_data?: Array<{ key?: string; value?: unknown }> } | null,
  key: string,
): string {
  const meta = Array.isArray(customer?.meta_data) ? customer!.meta_data! : [];
  const hit = meta.find((m) => m.key === key);
  return hit?.value != null ? String(hit.value) : "";
}

export async function findCustomerByEmail(email: string) {
  const headers = wooAuthHeaders();
  if (!headers || !BASE()) return null;
  const e = String(email || "").trim().toLowerCase();
  if (!e) return null;

  const res = await fetch(
    `${BASE()}/wp-json/wc/v3/customers?email=${encodeURIComponent(e)}&role=all`,
    { headers, cache: "no-store" },
  );
  if (!res.ok) return null;
  const arr = (await res.json().catch(() => [])) as unknown[];
  return Array.isArray(arr) && arr.length > 0
    ? (arr[0] as Record<string, unknown>)
    : null;
}

/** 以社群 ID 反查（WC 無原生 meta 查詢，掃近期顧客；再 fallback email 路徑） */
export async function findCustomerBySocialId(
  provider: SocialProvider,
  providerUserId: string,
) {
  const headers = wooAuthHeaders();
  if (!headers || !BASE()) return null;
  const id = String(providerUserId || "").trim();
  if (!id) return null;
  const metaKey = SOCIAL_ID_META[provider];

  // 多頁掃描（上限約 500）— 測試／中小型站可接受；正式量大可改 WP 自訂 endpoint
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(
      `${BASE()}/wp-json/wc/v3/customers?per_page=100&page=${page}&role=all&orderby=registered_date&order=desc`,
      { headers, cache: "no-store" },
    );
    if (!res.ok) break;
    const arr = (await res.json().catch(() => [])) as any[];
    if (!Array.isArray(arr) || arr.length === 0) break;
    const hit = arr.find((c) => metaValue(c, metaKey) === id);
    if (hit) return hit as Record<string, unknown>;
    if (arr.length < 100) break;
  }
  return null;
}

export type UpsertSocialInput = {
  provider: SocialProvider;
  providerUserId: string;
  /** 真實 email；沒有則傳空，由呼叫端給 synthetic */
  email: string;
  name?: string;
  picture?: string;
  /** OAuth 已驗證信箱時為 true */
  emailVerified?: boolean;
};

/**
 * 合併規則：
 * - 有真實 email → 以 email 找既有帳，綁定此社群 ID
 * - 無真實 email → 只以社群 ID 找既有帳，否則新建 synthetic
 * - 不刪除其他社群已綁定的 ID
 * - 不把真實 email 改成 synthetic
 */
export async function upsertSocialCustomer(input: UpsertSocialInput) {
  const headers = wooAuthHeaders();
  if (!headers || !BASE()) throw new Error("woo_config_missing");

  const provider = input.provider;
  const providerUserId = String(input.providerUserId || "").trim();
  if (!providerUserId) throw new Error("missing_provider_user_id");

  const realEmail = isUsableSocialEmail(input.email)
    ? String(input.email).trim().toLowerCase()
    : "";
  const name = String(input.name || "").trim();
  const picture = String(input.picture || "").trim();
  const [first, ...rest] = name.split(/\s+/);
  const last = rest.join(" ");

  let existing: Record<string, unknown> | null = null;
  if (realEmail) {
    existing = await findCustomerByEmail(realEmail);
  }
  if (!existing) {
    existing = await findCustomerBySocialId(provider, providerUserId);
  }

  const metaBase: Array<{ key: string; value: string }> = [
    { key: SOCIAL_ID_META[provider], value: providerUserId },
    { key: "oauth_provider", value: provider },
    { key: "oauth_last_login_at", value: new Date().toISOString() },
  ];
  if (input.emailVerified || realEmail) {
    metaBase.push({ key: "email_verified", value: "1" });
  }
  if (picture) metaBase.push({ key: "avatar_url", value: picture });
  if (name) metaBase.push({ key: "oauth_display_name", value: name });

  if (existing?.id) {
    const patch: Record<string, unknown> = { meta_data: metaBase };
    if (first && !String(existing.first_name || "").trim()) {
      patch.first_name = first;
      if (last) patch.last_name = last;
    }
    // 既有帳若是 synthetic、這次拿到真實 email，且該 email 尚未被占用 → 升級 email
    const existingEmail = String(existing.email || "").trim().toLowerCase();
    if (
      realEmail &&
      isSyntheticSocialEmail(existingEmail) &&
      realEmail !== existingEmail
    ) {
      const occupied = await findCustomerByEmail(realEmail);
      if (!occupied) {
        patch.email = realEmail;
        patch.username = realEmail;
      }
    }

    const upd = await fetch(`${BASE()}/wp-json/wc/v3/customers/${existing.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(patch),
      cache: "no-store",
    });
    if (upd.ok) return upd.json();
    console.error(
      `[socialAccount] update failed (${provider}):`,
      await upd.text().catch(() => ""),
    );
    return existing;
  }

  const createEmail =
    realEmail ||
    `${provider === "google" ? "google" : provider === "facebook" ? "fb" : "line"}_${providerUserId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64)}@${SYNTHETIC_EMAIL_DOMAIN}`;

  const createRes = await fetch(`${BASE()}/wp-json/wc/v3/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email: createEmail,
      username: createEmail,
      first_name: first || "",
      last_name: last || "",
      password:
        Math.random().toString(36).slice(2, 12) +
        Math.random().toString(36).slice(2, 12) +
        "Aa1!",
      meta_data: [
        ...metaBase,
        { key: "email_verified", value: realEmail ? "1" : "0" },
      ],
    }),
    cache: "no-store",
  });

  if (createRes.ok) return createRes.json();

  const errText = await createRes.text().catch(() => "");
  if (errText.includes("registration-error-email-exists") && realEmail) {
    const again = await findCustomerByEmail(realEmail);
    if (again?.id) {
      await fetch(`${BASE()}/wp-json/wc/v3/customers/${again.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ meta_data: metaBase }),
        cache: "no-store",
      });
      return again;
    }
  }
  console.error(`[socialAccount] create failed (${provider}):`, errText);
  throw new Error("create_user_failed");
}

export function applyExclusiveCustomSession(
  res: NextResponse,
  method: "line" | "facebook" | "email",
) {
  const nextAuthNames = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
    "next-auth.callback-url",
    "__Secure-next-auth.callback-url",
    "next-auth.pkce.code_verifier",
    "__Secure-next-auth.pkce.code_verifier",
  ];
  for (const name of nextAuthNames) {
    clearCookieOnResponse(res, name, {
      httpOnly: !name.includes("callback-url"),
    });
  }
  const isProd = process.env.NODE_ENV === "production";
  const domain = process.env.COOKIE_DOMAIN || undefined;
  res.cookies.set(AUTH_METHOD_COOKIE, method, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
    ...(domain ? { domain } : {}),
  });
}

/** Email／密碼登入：清 NextAuth，保留 auth_token */
export function applyExclusiveEmailSession(res: NextResponse) {
  applyExclusiveCustomSession(res, "email");
}

function clearCookieOnResponse(
  res: NextResponse,
  name: string,
  opts?: { httpOnly?: boolean },
) {
  const isProd = process.env.NODE_ENV === "production";
  const domain = process.env.COOKIE_DOMAIN || undefined;
  const base = {
    httpOnly: opts?.httpOnly !== false,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    maxAge: 0,
  };
  res.cookies.set(name, "", base);
  if (domain) {
    res.cookies.set(name, "", { ...base, domain });
  }
}

/** Google（NextAuth）登入成功：清掉自訂 auth_token */
export function clearCustomAuthCookiesInRequest() {
  try {
    const store = cookies();
    const names = [
      "auth_token",
      "user_email",
      "user_name",
      "jwt",
      "facebook_oauth_state",
      "line_oauth_state",
    ];
    for (const name of names) {
      try {
        store.delete(name);
      } catch {
        // ignore
      }
    }
    store.set(AUTH_METHOD_COOKIE, "google", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
  } catch (e) {
    console.error("[socialAccount] clearCustomAuthCookiesInRequest failed:", e);
  }
}

export function resolveLinkedProviders(
  customer: { meta_data?: Array<{ key?: string; value?: unknown }> } | null,
): SocialProvider[] {
  const out: SocialProvider[] = [];
  for (const p of ["google", "facebook", "line"] as SocialProvider[]) {
    if (metaValue(customer, SOCIAL_ID_META[p])) out.push(p);
  }
  const last = String(metaValue(customer, "oauth_provider") || "").toLowerCase();
  if (
    (last === "google" || last === "facebook" || last === "line") &&
    !out.includes(last)
  ) {
    out.push(last);
  }
  return out;
}

export function resolvePrimarySocialProvider(
  customer: { meta_data?: Array<{ key?: string; value?: unknown }> } | null,
): SocialProvider | null {
  const last = String(metaValue(customer, "oauth_provider") || "").toLowerCase();
  if (last === "google" || last === "facebook" || last === "line") return last;
  const linked = resolveLinkedProviders(customer);
  return linked[0] || null;
}
