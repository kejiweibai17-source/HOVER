// src/lib/auth-options.ts
import type { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { cookies } from "next/headers";

/** ===== WooCommerce 基本設定 ===== */
const BASE = process.env.WC_API_BASE || "";
const CK = process.env.WC_CONSUMER_KEY || "";
const CS = process.env.WC_CONSUMER_SECRET || "";

function hasWooConfig() {
  return Boolean(BASE && CK && CS);
}

function basicAuth() {
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

function getAuthHeaders() {
  return {
    Authorization: basicAuth(),
    "Content-Type": "application/json",
  };
}

/** 以 email upsert Woo 客戶（沒有就建立；已有則同步 Google 姓名/大頭貼） */
async function upsertWooCustomer(
  email: string,
  name?: string,
  avatarUrl?: string,
) {
  if (!hasWooConfig()) return null;

  const headers = getAuthHeaders();
  const [first, ...rest] = String(name || "").trim().split(/\s+/);
  const last = rest.join(" ");

  const q = await fetch(
    `${BASE}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}&role=all`,
    { headers, cache: "no-store" },
  );
  const arr = (await q.json().catch(() => [])) || [];

  if (Array.isArray(arr) && arr.length > 0) {
    const existing = arr[0];
    const patch: Record<string, unknown> = {};
    const meta: Array<{ key: string; value: string }> = [];

    if (first && !String(existing.first_name || "").trim()) {
      patch.first_name = first;
      if (last) patch.last_name = last;
    }

    if (avatarUrl) {
      meta.push({ key: "avatar_url", value: avatarUrl });
    }
    if (name?.trim()) {
      meta.push({ key: "oauth_display_name", value: name.trim() });
    }

    if (Object.keys(patch).length > 0 || meta.length > 0) {
      if (meta.length > 0) patch.meta_data = meta;
      const upd = await fetch(`${BASE}/wp-json/wc/v3/customers/${existing.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(patch),
      });
      if (upd.ok) return upd.json();
      const errText = await upd.text().catch(() => "");
      console.error("Woo customer update failed:", errText);
    }

    return existing;
  }

  const meta_data: Array<{ key: string; value: string }> = [
    { key: "email_verified", value: "1" },
  ];
  if (avatarUrl) meta_data.push({ key: "avatar_url", value: avatarUrl });
  if (name?.trim()) meta_data.push({ key: "oauth_display_name", value: name.trim() });

  const r = await fetch(`${BASE}/wp-json/wc/v3/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      username: email,
      first_name: first || "",
      last_name: last || "",
      password: Math.random().toString(36).slice(2, 12),
      meta_data,
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    // WordPress 已有同 email 帳號但 WC email 查詢漏掉時，再試 role=all 搜尋
    if (t.includes("registration-error-email-exists")) {
      const retry = await fetch(
        `${BASE}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}&role=all`,
        { headers, cache: "no-store" },
      );
      const retryArr = (await retry.json().catch(() => [])) || [];
      if (Array.isArray(retryArr) && retryArr.length > 0) {
        const existing = retryArr[0];
        const patch: Record<string, unknown> = {};
        const meta: Array<{ key: string; value: string }> = [];
        if (first && !String(existing.first_name || "").trim()) {
          patch.first_name = first;
          if (last) patch.last_name = last;
        }
        if (avatarUrl) meta.push({ key: "avatar_url", value: avatarUrl });
        if (name?.trim()) meta.push({ key: "oauth_display_name", value: name.trim() });
        if (Object.keys(patch).length > 0 || meta.length > 0) {
          if (meta.length > 0) patch.meta_data = meta;
          const upd = await fetch(`${BASE}/wp-json/wc/v3/customers/${existing.id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify(patch),
          });
          if (upd.ok) return upd.json();
        }
        return existing;
      }
    }
    throw new Error(`Woo upsert failed: ${t}`);
  }
  return r.json();
}

async function fetchWooCustomerById(id: number) {
  if (!hasWooConfig()) return null;

  const headers = getAuthHeaders();
  const r = await fetch(`${BASE}/wp-json/wc/v3/customers/${id}`, {
    headers,
    cache: "no-store",
  });
  if (!r.ok) return null;
  return r.json();
}

function parseAmbassadorIdFromRef(ref?: string): number | null {
  const v = String(ref || "").trim().toUpperCase();
  const m = v.match(/^UF(\d+)$/);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function ensureFriend50Coupon(params: {
  ambassadorId: number;
  customerId: number;
  customerEmail: string;
}) {
  if (!hasWooConfig()) return { ok: false, code: "", existed: false };

  const { ambassadorId, customerId, customerEmail } = params;
  const headers = getAuthHeaders();
  const code = `UFFRD-${ambassadorId}-${customerId}`;

  const existRes = await fetch(
    `${BASE}/wp-json/wc/v3/coupons?code=${encodeURIComponent(code)}`,
    { headers, cache: "no-store" },
  );
  const existArr = await existRes.json().catch(() => []);
  if (Array.isArray(existArr) && existArr.length > 0) {
    return { ok: true, code, existed: true };
  }

  const expires = new Date();
  expires.setMonth(expires.getMonth() + 2);

  const cCreateRes = await fetch(`${BASE}/wp-json/wc/v3/coupons`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      code,
      discount_type: "fixed_cart",
      amount: "50",
      individual_use: true,
      usage_limit: 1,
      usage_limit_per_user: 1,
      email_restrictions: [String(customerEmail).toLowerCase()],
      date_expires: expires.toISOString(),
      description: "親友推薦註冊購物金 50 元",
      meta_data: [{ key: "uf_ref_friend_coupon", value: "1" }],
    }),
  });

  if (!cCreateRes.ok) {
    const errTxt = await cCreateRes.text();
    throw new Error(`create friend coupon failed: ${errTxt}`);
  }

  return { ok: true, code, existed: false };
}

async function handleReferralIfAny(customer: any) {
  if (!hasWooConfig() || !customer?.id) return;

  let ref = "";
  try {
    ref = cookies().get("uf_ref")?.value || "";
  } catch {
    ref = "";
  }

  const ambassadorId = parseAmbassadorIdFromRef(ref);
  if (!ambassadorId) return;

  const customerId = Number(customer?.id || 0);
  const customerEmail = String(customer?.email || "").trim().toLowerCase();
  if (!customerId || !customerEmail) return;
  if (ambassadorId === customerId) return;

  const fresh = await fetchWooCustomerById(customerId);
  if (!fresh?.id) return;

  const meta: any[] = Array.isArray(fresh.meta_data) ? fresh.meta_data : [];
  const existingReferredBy = Number(
    meta.find((m) => m.key === "uf_referred_by")?.value || 0,
  );
  const needBind = !existingReferredBy;

  if (needBind) {
    await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        meta_data: [{ key: "uf_referred_by", value: String(ambassadorId) }],
      }),
    }).catch(() => {});
  }

  const hasFriend50Meta = meta.some(
    (m) => m.key === "uf_ref_friend_coupon_issued" && String(m.value) === "1",
  );

  if (!hasFriend50Meta) {
    await ensureFriend50Coupon({ ambassadorId, customerId, customerEmail });
    await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        meta_data: [{ key: "uf_ref_friend_coupon_issued", value: "1" }],
      }),
    }).catch(() => {});
  }

  try {
    cookies().set("uf_ref", "", { path: "/", maxAge: 0 });
  } catch {
    // ignore
  }
}

const providers: AuthOptions["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
  );
}

if (process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET) {
  providers.push(
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
    }),
  );
}

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers,
  callbacks: {
    async signIn({ user }) {
      if (!user?.email) {
        console.warn("OAuth user has no email, skip Woo upsert");
        return true;
      }

      if (!hasWooConfig()) {
        console.warn("WooCommerce API keys missing — OAuth login proceeds without sync");
        return true;
      }

      try {
        const customer = await upsertWooCustomer(
          user.email,
          user.name || undefined,
          user.image || undefined,
        );
        if (customer) {
          try {
            await handleReferralIfAny(customer);
          } catch (e) {
            console.error("handleReferralIfAny error (login not blocked):", e);
          }
        }
      } catch (e) {
        console.error("upsertWooCustomer error (login not blocked):", e);
      }

      return true;
    },

    async jwt({ token, user, account, profile }) {
      if (user?.email) {
        token.email = user.email;
        if (user.name) token.name = user.name;
        const image =
          user.image ||
          (profile as { picture?: string } | undefined)?.picture ||
          (account as { picture?: string } | undefined)?.picture;
        if (image) token.picture = image;

        if (hasWooConfig()) {
          try {
            const headers = { Authorization: basicAuth() };
            const q = await fetch(
              `${BASE}/wp-json/wc/v3/customers?email=${encodeURIComponent(user.email)}&role=all`,
              { headers, cache: "no-store" },
            );
            const arr = (await q.json().catch(() => [])) || [];
            const customer =
              Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
            if (customer?.id) token.customerId = Number(customer.id);
          } catch (e) {
            console.error("jwt callback: fetch Woo customer failed", e);
          }
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (!session.user) session.user = {};
      if (token?.email) session.user.email = token.email as string;
      if (token?.name) session.user.name = token.name as string;
      if (token?.picture) session.user.image = token.picture as string;
      if (token?.customerId) (session as any).customerId = token.customerId;
      return session;
    },
  },
};
