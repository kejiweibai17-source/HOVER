// src/lib/auth-options.ts
import type { AuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { cookies } from "next/headers";

/** ===== WooCommerce 基本設定 ===== */
const BASE = process.env.WC_API_BASE!;
const CK = process.env.WC_CONSUMER_KEY!;
const CS = process.env.WC_CONSUMER_SECRET!;

function basicAuth() {
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

function getAuthHeaders() {
  return {
    Authorization: basicAuth(),
    "Content-Type": "application/json",
  };
}

/** 以 email upsert Woo 客戶（沒有就建立），回傳 customer */
async function upsertWooCustomer(email: string, name?: string) {
  const headers = getAuthHeaders();

  // 1) 查是否存在
  const q = await fetch(
    `${BASE}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}`,
    { headers, cache: "no-store" }
  );
  const arr = (await q.json().catch(() => [])) || [];
  if (Array.isArray(arr) && arr.length > 0) return arr[0];

  // 2) 不存在 → 建立
  const [first, ...rest] = String(name || "").trim().split(/\s+/);
  const last = rest.join(" ");
  const r = await fetch(`${BASE}/wp-json/wc/v3/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      username: email, // 你也可以改成 email.split("@")[0]
      first_name: first || "",
      last_name: last || "",
      password: Math.random().toString(36).slice(2, 12),
      meta_data: [{ key: "email_verified", value: "1" }], // OAuth 視為已驗證
    }),
  });

  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Woo upsert failed: ${t}`);
  }
  return r.json();
}

/** 讀 Woo customer（by id） */
async function fetchWooCustomerById(id: number) {
  const headers = getAuthHeaders();
  const r = await fetch(`${BASE}/wp-json/wc/v3/customers/${id}`, {
    headers,
    cache: "no-store",
  });
  if (!r.ok) return null;
  return r.json();
}

/** 解析 refCode → 推薦人 customerId
 * 你目前 refCode 是 UF + customerId（例：UF14）
 * 這裡用最穩的方式：若符合 UF\d+ 就直接取 id
 */
function parseAmbassadorIdFromRef(ref?: string): number | null {
  const v = String(ref || "").trim().toUpperCase();
  const m = v.match(/^UF(\d+)$/);
  if (!m) return null;
  const id = Number(m[1]);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** 建立「被推薦人 $50」優惠券（只發一次） */
async function ensureFriend50Coupon(params: {
  ambassadorId: number;
  customerId: number;
  customerEmail: string;
}) {
  const { ambassadorId, customerId, customerEmail } = params;
  const headers = getAuthHeaders();

  // 一人一次：固定一張（你也可以改成每次不同碼）
  const code = `UFFRD-${ambassadorId}-${customerId}`;

  // 先查是否存在（避免重複建立）
  const existRes = await fetch(
    `${BASE}/wp-json/wc/v3/coupons?code=${encodeURIComponent(code)}`,
    { headers, cache: "no-store" }
  );
  const existArr = await existRes.json().catch(() => []);
  if (Array.isArray(existArr) && existArr.length > 0) {
    return { ok: true, code, existed: true };
  }

  const expires = new Date();
  expires.setMonth(expires.getMonth() + 2); // 兩個月效期，可自行調整

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

/** 綁定被推薦人到推薦人 + 發 $50（有去重） */
async function handleReferralIfAny(customer: any) {
  // 1) 讀 cookie 的 ref（你在 /register 已經寫 uf_ref）
  let ref = "";
  try {
    ref = cookies().get("uf_ref")?.value || "";
  } catch {
    // 某些環境取不到 cookies() 就略過
    ref = "";
  }

  const ambassadorId = parseAmbassadorIdFromRef(ref);
  if (!ambassadorId) return;

  const customerId = Number(customer?.id || 0);
  const customerEmail = String(customer?.email || "").trim().toLowerCase();
  if (!customerId || !customerEmail) return;

  // 避免自己推薦自己
  if (ambassadorId === customerId) return;

  // 2) 撈被推薦人最新 meta（確保去重判斷準）
  const fresh = await fetchWooCustomerById(customerId);
  if (!fresh?.id) return;

  const meta: any[] = Array.isArray(fresh.meta_data) ? fresh.meta_data : [];

  const existingReferredBy = Number(
    meta.find((m) => m.key === "uf_referred_by")?.value || 0
  );

  // 若已經綁過推薦人，就不要覆蓋
  const needBind = !existingReferredBy;

  // 3) 若需要，寫入 uf_referred_by（給 webhook 發 200 用）
  if (needBind) {
    await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        meta_data: [{ key: "uf_referred_by", value: String(ambassadorId) }],
      }),
    }).catch(() => {});
  }

  // 4) 發被推薦人 $50（只發一次）
  const hasFriend50Meta = meta.some(
    (m) => m.key === "uf_ref_friend_coupon_issued" && String(m.value) === "1"
  );

  if (!hasFriend50Meta) {
    await ensureFriend50Coupon({
      ambassadorId,
      customerId,
      customerEmail,
    });

    // 標記已發放
    await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify({
        meta_data: [{ key: "uf_ref_friend_coupon_issued", value: "1" }],
      }),
    }).catch(() => {});
  }

  // 5) 用完就清 cookie（避免之後自己登入也一直被當成新推薦）
  try {
    // 注意：Next.js server 端清 cookie 需要 set（這裡是 best-effort）
    cookies().set("uf_ref", "", { path: "/", maxAge: 0 });
  } catch {
    // ignore
  }
}

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET!,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID!,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    /** OAuth 成功回來後：同步 Woo + 處理推薦，但「不阻擋登入」 */
    async signIn({ user }) {
      if (!user?.email) {
        console.warn("OAuth user has no email, skip Woo upsert");
        return true;
      }

      try {
        // 1) upsert Woo customer
        const customer = await upsertWooCustomer(user.email, user.name || undefined);

        // 2) 若有 ref cookie：綁推薦人 + 發 $50
        //    （失敗也不阻擋登入）
        try {
          await handleReferralIfAny(customer);
        } catch (e) {
          console.error("handleReferralIfAny error (login not blocked):", e);
        }
      } catch (e) {
        console.error("upsertWooCustomer error (login not blocked):", e);
      }

      return true;
    },

    /** 把 email/name 與 Woo customerId 帶到 JWT */
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
        if (user.name) token.name = user.name;

        try {
          const headers = { Authorization: basicAuth() };
          const q = await fetch(
            `${BASE}/wp-json/wc/v3/customers?email=${encodeURIComponent(user.email)}`,
            { headers, cache: "no-store" }
          );
          const arr = (await q.json().catch(() => [])) || [];
          const customer = Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
          if (customer?.id) token.customerId = Number(customer.id);
        } catch (e) {
          console.error("jwt callback: fetch Woo customer failed", e);
        }
      }
      return token;
    },

    /** 前端 session：補上 email/name/customerId */
    async session({ session, token }) {
      if (!session.user) session.user = {};
      if (token?.email) session.user.email = token.email as string;
      if (token?.name) session.user.name = token.name as string;
      if (token?.customerId) (session as any).customerId = token.customerId;
      return session;
    },
  },
};
