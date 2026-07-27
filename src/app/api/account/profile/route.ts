// src/app/api/account/profile/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { authOptions } from "@/lib/auth-options";
import {
  buildExclusiveMetaUpdates,
  computeMembership,
  mapWcOrdersToLite,
  netOrderTotal,
} from "@/lib/membership";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BASE =
  process.env.WC_API_BASE || "https://inf.fjg.mybluehost.me/website_4ad5d5f2";
const CK = process.env.WC_CONSUMER_KEY;
const CS = process.env.WC_CONSUMER_SECRET;
const JWT_SECRET =
  process.env.RESET_TOKEN_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.JWT_SECRET ||
  "secret";

function basicAuth() {
  if (!CK || !CS) return undefined;
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

function parseAdminEmails() {
  return String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function resolveAvatarUrl(customer: any, sessionImage?: string | null) {
  const meta: any[] = Array.isArray(customer?.meta_data) ? customer.meta_data : [];
  const fromMeta = meta.find((m) => m.key === "avatar_url")?.value;
  if (fromMeta) return String(fromMeta);

  if (sessionImage) return sessionImage;

  const wcAvatar = customer?.avatar_url ? String(customer.avatar_url) : "";
  if (wcAvatar && !isPlaceholderGravatar(wcAvatar)) return wcAvatar;

  return null;
}

function isPlaceholderGravatar(url: string) {
  return (
    /gravatar\.com/i.test(url) &&
    /[?&]d=(mm|mp|identicon|monsterid|wavatar|retro|robohash)/i.test(url)
  );
}

function resolveDisplayName(customer: any, sessionName?: string | null) {
  const full = `${customer?.first_name || ""}${customer?.last_name ? ` ${customer.last_name}` : ""}`.trim();
  if (full) return full;

  const meta: any[] = Array.isArray(customer?.meta_data) ? customer.meta_data : [];
  const fromOAuthMeta = meta.find((m) => m.key === "oauth_display_name")?.value;
  if (fromOAuthMeta) return String(fromOAuthMeta).trim();

  const fromSession = String(sessionName || "").trim();
  if (fromSession) return fromSession;
  return customer?.email?.split("@")[0] || "會員";
}

function normalizeAuthProvider(raw: unknown): string | null {
  const v = String(raw || "").trim().toLowerCase();
  if (v === "google" || v === "facebook" || v === "line") return v;
  return null;
}

function resolveAuthProviderFromMeta(customer: any): string | null {
  const meta: any[] = Array.isArray(customer?.meta_data) ? customer.meta_data : [];
  const fromKey = normalizeAuthProvider(
    meta.find((m) => m.key === "oauth_provider")?.value,
  );
  if (fromKey) return fromKey;
  if (meta.find((m) => m.key === "social_login_facebook_id")?.value) {
    return "facebook";
  }
  if (meta.find((m) => m.key === "social_login_line_id")?.value) {
    return "line";
  }
  return null;
}

async function resolveAuthProvider(
  session: any,
  customer: any,
): Promise<string | null> {
  const fromSession = normalizeAuthProvider(session?.authProvider);
  if (fromSession) return fromSession;

  const cookieStore = cookies();
  const authToken = cookieStore.get("auth_token")?.value;
  if (authToken) {
    try {
      const decoded = jwt.verify(authToken, JWT_SECRET) as any;
      const fromToken = normalizeAuthProvider(decoded?.provider);
      if (fromToken) return fromToken;
    } catch {
      // ignore invalid token
    }
  }

  const fromMeta = resolveAuthProviderFromMeta(customer);
  if (fromMeta) return fromMeta;

  // NextAuth session 存在 = 社群登入（本站 Email 登入不走 NextAuth）
  // 舊 session 可能尚未寫入 provider，預設標示為 Google
  if (session?.user?.email) return "google";

  return null;
}

/* ========= HOVER 會員制度（FRIENDS / EXCLUSIVE） ========= */
// 提取並驗證用戶 Email 的輔助函式
async function getAuthenticatedEmail() {
  const auth = basicAuth();
  if (!auth) return null;

  const session = await getServerSession(authOptions);
  const cookieStore = cookies();

  let email: string | null = session?.user?.email || null;

  if (!email) {
    const emailCookie = cookieStore.get("user_email");
    if (emailCookie?.value) email = emailCookie.value;
  }

  if (!email) {
    const authToken = cookieStore.get("auth_token")?.value;
    if (authToken) {
      try {
        const decoded = jwt.verify(authToken, JWT_SECRET) as any;
        if (decoded?.email) email = decoded.email;
      } catch (e) {
        console.error("auth_token verify failed:", e);
      }
    }
  }

  if (!email) {
    const jwtVal = cookieStore.get("jwt")?.value;
    if (jwtVal) {
      try {
        const meRes = await fetch(`${BASE}/wp-json/wp/v2/users/me`, {
          headers: { Authorization: `Bearer ${jwtVal}` },
          cache: "no-store",
        });
        if (meRes.ok) {
          const me = await meRes.json();
          if (me?.email) email = me.email;
        }
      } catch (e) {
        console.error("users/me error", e);
      }
    }
  }
  return email;
}

/** Mutations must use a signed session/token, never the unsigned email cookie. */
async function getVerifiedAuthenticatedEmail() {
  const session = await getServerSession(authOptions);
  const sessionEmail = String(session?.user?.email || "").trim().toLowerCase();
  if (sessionEmail) return sessionEmail;

  const cookieStore = cookies();
  const authToken = cookieStore.get("auth_token")?.value;
  if (authToken) {
    try {
      const decoded = jwt.verify(authToken, JWT_SECRET) as any;
      const tokenEmail = String(decoded?.email || "").trim().toLowerCase();
      if (tokenEmail) return tokenEmail;
    } catch {
      // A stale social-login token should not block a valid WordPress JWT.
    }
  }

  const jwtValue = cookieStore.get("jwt")?.value;
  if (!jwtValue) return null;

  try {
    const meRes = await fetch(`${BASE}/wp-json/wp/v2/users/me`, {
      headers: { Authorization: `Bearer ${jwtValue}` },
      cache: "no-store",
    });
    if (!meRes.ok) return null;
    const me = await meRes.json();
    return String(me?.email || "").trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

export async function GET() {
  const noCache = { "Cache-Control": "no-store, no-cache, must-revalidate" };

  try {
    const auth = basicAuth();
    if (!auth) {
      console.error("WooCommerce API keys missing");
      return NextResponse.json(
        { loggedIn: false, customer: null, membership: null },
        { headers: noCache }
      );
    }

    const email = await getAuthenticatedEmail();

    if (!email) {
      return NextResponse.json(
        { loggedIn: false, customer: null, membership: null, isAdmin: false },
        { headers: noCache }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const adminEmails = parseAdminEmails();
    const isAdmin = adminEmails.includes(normalizedEmail);
    const session = await getServerSession(authOptions);

    // ===== Fetch WC customer by email =====
    // ✅ 修正：加入 role=all，避免管理員帳號被過濾掉
    let customer: any = null;
    const custRes = await fetch(
      `${BASE}/wp-json/wc/v3/customers?email=${encodeURIComponent(
        normalizedEmail
      )}&role=all`,
      {
        headers: { Authorization: auth },
        cache: "no-store",
      }
    );

    if (custRes.ok) {
      const custArr = await custRes.json();
      customer =
        Array.isArray(custArr) && custArr.length > 0 ? custArr[0] : null;
    }

    // Fallback: 如果 WC 找不到，嘗試找 WP User
    if (!customer) {
      const wpUserRes = await fetch(
        `${BASE}/wp-json/wp/v2/users?search=${encodeURIComponent(
          normalizedEmail
        )}`,
        {
          headers: { Authorization: auth },
          cache: "no-store",
        }
      );
      if (wpUserRes.ok) {
        const wpUsers = await wpUserRes.json();
        const matchedUser = wpUsers.find(
          (u: any) => u.email?.toLowerCase() === normalizedEmail
        );
        if (matchedUser) {
          const idRes = await fetch(`${BASE}/wp-json/wc/v3/customers/${matchedUser.id}`, {
            headers: { Authorization: auth },
            cache: "no-store",
          });
          if (idRes.ok) {
            customer = await idRes.json();
          } else {
            customer = {
              id: matchedUser.id,
              email: matchedUser.email,
              first_name: matchedUser.name,
              username: matchedUser.slug
            };
          }
        }
      }
    }

    // ===== Calculate spent in last 12 months
    let totalSpent12m = 0;
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
    const afterIso = twelveMonthsAgo.toISOString();

    let ordersForCalc: any[] = [];

    // 如果有 ID，用 ID 查訂單 (比較準)
    if (customer?.id) {
      const oRes = await fetch(
        `${BASE}/wp-json/wc/v3/orders?customer=${customer.id
        }&status=processing,completed&per_page=100&after=${encodeURIComponent(
          afterIso
        )}`,
        {
          headers: { Authorization: auth },
          cache: "no-store",
        }
      );
      if (oRes.ok) ordersForCalc = await oRes.json();
    }

    // Fallback: 如果沒 ID 或訂單是 0，改用 Email 搜 (針對訪客結帳)
    if ((!ordersForCalc || ordersForCalc.length === 0) && normalizedEmail) {
      const oRes = await fetch(
        `${BASE}/wp-json/wc/v3/orders?per_page=100&after=${encodeURIComponent(
          afterIso
        )}&search=${encodeURIComponent(normalizedEmail)}`,
        {
          headers: { Authorization: auth },
          cache: "no-store",
        }
      );
      if (oRes.ok) {
        const all = await oRes.json();
        ordersForCalc = all.filter(
          (o: any) =>
            o?.billing?.email?.toLowerCase() === normalizedEmail &&
            (o.status === "processing" || o.status === "completed")
        );
      }
    }

    totalSpent12m = ordersForCalc.reduce(
      (sum, o) => sum + netOrderTotal({ total: o.total, totalRefunded: o.total_refunded, date_created: o.date_created }),
      0,
    );

    const ordersLite = mapWcOrdersToLite(ordersForCalc);

    // 同步臻享會員效期 meta（升級 / 續會）
    if (customer?.id) {
      const metaUpdates = buildExclusiveMetaUpdates(
        ordersLite,
        customer.meta_data || [],
      );
      if (metaUpdates.length > 0) {
        try {
          await fetch(`${BASE}/wp-json/wc/v3/customers/${customer.id}`, {
            method: "PUT",
            headers: {
              Authorization: auth,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ meta_data: metaUpdates }),
          });
          for (const u of metaUpdates) {
            const existing = (customer.meta_data || []).find(
              (m: any) => m.key === u.key,
            );
            if (existing) existing.value = u.value;
            else (customer.meta_data ||= []).push(u);
          }
        } catch (e) {
          console.error("sync exclusive meta failed:", e);
        }
      }
    }

    const membership = computeMembership(
      ordersLite,
      customer?.meta_data || [],
    );

    // 向下相容舊欄位名稱
    const membershipPayload = {
      ...membership,
      upgradeGift: membership.welcomeGift,
    };

    // 解析生日
    let birthday = null;
    if (customer?.meta_data && Array.isArray(customer.meta_data)) {
      const bdMeta = customer.meta_data.find(
        (m: any) =>
          m.key === "birthday" ||
          m.key === "billing_birth_date" ||
          m.key === "_billing_birth_date"
      );
      if (bdMeta?.value) birthday = bdMeta.value;
    }

    const customerPayload = customer?.id
      ? {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
        username: customer.username,
        display_name: resolveDisplayName(customer, session?.user?.name),
        avatar_url: resolveAvatarUrl(customer, session?.user?.image),
        birthday: birthday,
        phone: customer?.billing?.phone || "",
        billing_phone: customer?.billing?.phone || "",
        billing_address: [
          customer?.billing?.address_1,
          customer?.billing?.address_2,
        ]
          .filter(Boolean)
          .join(" "),
      }
      : {
        email: normalizedEmail,
        display_name: resolveDisplayName(null, session?.user?.name) || normalizedEmail.split("@")[0],
        avatar_url: session?.user?.image || null,
      };

    const authProvider = await resolveAuthProvider(session, customer);

    return NextResponse.json(
      {
        loggedIn: true,
        customer: customerPayload,
        membership: membershipPayload,
        isAdmin,
        authProvider,
      },
      { headers: noCache }
    );
  } catch (e) {
    console.error("/api/account/profile error:", e);
    return NextResponse.json(
      { loggedIn: false, message: "系統錯誤", isAdmin: false },
      { status: 500, headers: noCache }
    );
  }
}

// PUT：更新會員資料或設定一次性生日
export async function PUT(req: Request) {
  try {
    const auth = basicAuth();
    if (!auth) {
      return NextResponse.json({ ok: false, message: "Auth Error" }, { status: 500 });
    }

    const email = await getVerifiedAuthenticatedEmail();
    if (!email) {
      return NextResponse.json(
        { ok: false, message: "尚未登入" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const birthday = String(body?.birthday || "").trim();
    const profile = body?.profile;
    const isProfileUpdate = profile && typeof profile === "object";

    if (!birthday && !isProfileUpdate) {
      return NextResponse.json({ ok: false, message: "無效的資料" });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. 嘗試搜尋現有會員
    let customerId = null;
    let existingBirthday = null;
    let metaData: any[] = [];

    // ✅ 關鍵修正：這裡也要加上 role=all
    const custRes = await fetch(
      `${BASE}/wp-json/wc/v3/customers?email=${encodeURIComponent(
        normalizedEmail
      )}&role=all`,
      {
        headers: { Authorization: auth },
        cache: "no-store",
      }
    );

    if (custRes.ok) {
      const custArr = await custRes.json();
      if (Array.isArray(custArr) && custArr.length > 0) {
        const c = custArr[0];
        customerId = c.id;
        metaData = c.meta_data || [];
      }
    }

    // Fallback: 嘗試搜尋 WP User (雙重保險)
    if (!customerId) {
      const wpUserRes = await fetch(
        `${BASE}/wp-json/wp/v2/users?search=${encodeURIComponent(normalizedEmail)}`,
        { headers: { Authorization: auth }, cache: "no-store" }
      );
      if (wpUserRes.ok) {
        const wpUsers = await wpUserRes.json();
        const matchedUser = wpUsers.find((u: any) => u.email?.toLowerCase() === normalizedEmail);
        if (matchedUser) {
          customerId = matchedUser.id;
          // 用 ID 再抓一次 WC 資料確保有 meta_data
          const idRes = await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
            headers: { Authorization: auth }
          });
          if (idRes.ok) {
            const c = await idRes.json();
            metaData = c.meta_data || [];
          }
        }
      }
    }

    if (!customerId) {
      return NextResponse.json(
        { ok: false, message: "找不到會員資料" },
        { status: 404 },
      );
    }

    if (isProfileUpdate) {
      const name = String(profile.name || "").trim();
      const phone = String(profile.phone || "").trim();
      const address = String(profile.address || "").trim();

      if (!name) {
        return NextResponse.json(
          { ok: false, message: "請輸入姓名" },
          { status: 400 },
        );
      }
      if (name.length > 100 || phone.length > 30 || address.length > 250) {
        return NextResponse.json(
          { ok: false, message: "輸入內容過長" },
          { status: 400 },
        );
      }
      if (phone && !/^[0-9+\-()\s#]+$/.test(phone)) {
        return NextResponse.json(
          { ok: false, message: "電話格式不正確" },
          { status: 400 },
        );
      }

      const updateRes = await fetch(
        `${BASE}/wp-json/wc/v3/customers/${customerId}`,
        {
          method: "PUT",
          headers: {
            Authorization: auth,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            first_name: name,
            last_name: "",
            billing: {
              first_name: name,
              last_name: "",
              phone,
              address_1: address,
              address_2: "",
            },
            meta_data: [{ key: "oauth_display_name", value: name }],
          }),
          cache: "no-store",
        },
      );

      if (!updateRes.ok) {
        const errorBody = await updateRes.json().catch(() => ({}));
        return NextResponse.json(
          { ok: false, message: errorBody?.message || "會員資料更新失敗" },
          { status: updateRes.status },
        );
      }

      return NextResponse.json({ ok: true, message: "會員資料已更新" });
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
      return NextResponse.json(
        { ok: false, message: "生日格式不正確" },
        { status: 400 },
      );
    }

    // 2. 檢查是否已設定過
    if (customerId) {
      const bdMeta = metaData.find(
        (m: any) =>
          m.key === "birthday" ||
          m.key === "billing_birth_date" ||
          m.key === "_billing_birth_date"
      );
      if (bdMeta?.value) existingBirthday = bdMeta.value;

      if (existingBirthday) {
        return NextResponse.json({ ok: false, message: "生日已設定，無法修改" });
      }
    }

    // 3. 更新現有會員
    if (customerId) {
      console.log(`Updating customer ${customerId} birthday to ${birthday}`);
      const updateRes = await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
        method: "PUT",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          meta_data: [
            { key: "birthday", value: birthday },
            { key: "billing_birth_date", value: birthday },
            { key: "_billing_birth_date", value: birthday }
          ],
        }),
      });

      if (!updateRes.ok) {
        const err = await updateRes.json();
        console.error("Update failed:", err);
        return NextResponse.json({ ok: false, message: err.message || "更新失敗" });
      }
    }

    return NextResponse.json({ ok: true, message: "生日設定成功" });

  } catch (e) {
    console.error("PUT profile error:", e);
    return NextResponse.json(
      { ok: false, message: "系統錯誤" },
      { status: 500 }
    );
  }
}

// PATCH：驗證舊密碼後修改 WordPress / WooCommerce 密碼
export async function PATCH(req: Request) {
  try {
    const auth = basicAuth();
    if (!auth) {
      return NextResponse.json(
        { ok: false, message: "Auth Error" },
        { status: 500 },
      );
    }

    const email = await getVerifiedAuthenticatedEmail();
    if (!email) {
      return NextResponse.json(
        { ok: false, message: "尚未登入" },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const currentPassword = String(body?.currentPassword || "");
    const newPassword = String(body?.newPassword || "");

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { ok: false, message: "請完整填寫密碼欄位" },
        { status: 400 },
      );
    }
    if (newPassword.length < 8) {
      return NextResponse.json(
        { ok: false, message: "新密碼長度至少 8 碼" },
        { status: 400 },
      );
    }
    if (currentPassword === newPassword) {
      return NextResponse.json(
        { ok: false, message: "新密碼不可與舊密碼相同" },
        { status: 400 },
      );
    }

    const customerRes = await fetch(
      `${BASE}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}&role=all`,
      { headers: { Authorization: auth }, cache: "no-store" },
    );
    const customers = customerRes.ok
      ? await customerRes.json().catch(() => [])
      : [];
    const customer = Array.isArray(customers) ? customers[0] : null;
    const customerId = customer?.id;
    if (!customerId) {
      return NextResponse.json(
        { ok: false, message: "找不到會員資料" },
        { status: 404 },
      );
    }

    const verifyRes = await fetch(`${BASE}/wp-json/jwt-auth/v1/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: customer?.username || email,
        password: currentPassword,
      }),
      cache: "no-store",
    });
    if (!verifyRes.ok) {
      return NextResponse.json(
        { ok: false, message: "舊密碼不正確" },
        { status: 400 },
      );
    }

    const updateRes = await fetch(
      `${BASE}/wp-json/wc/v3/customers/${customerId}`,
      {
        method: "PUT",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: newPassword }),
        cache: "no-store",
      },
    );
    if (!updateRes.ok) {
      const errorBody = await updateRes.json().catch(() => ({}));
      return NextResponse.json(
        { ok: false, message: errorBody?.message || "密碼修改失敗" },
        { status: updateRes.status },
      );
    }

    return NextResponse.json({ ok: true, message: "密碼修改成功" });
  } catch (error) {
    console.error("PATCH profile password error:", error);
    return NextResponse.json(
      { ok: false, message: "系統錯誤，請稍後再試" },
      { status: 500 },
    );
  }
}