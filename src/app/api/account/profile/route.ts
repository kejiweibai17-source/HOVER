// src/app/api/account/profile/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BASE =
  process.env.WC_API_BASE || "https://inf.fjg.mybluehost.me/website_4ad5d5f2";
const CK = process.env.WC_CONSUMER_KEY;
const CS = process.env.WC_CONSUMER_SECRET;
const JWT_SECRET =
  process.env.RESET_TOKEN_SECRET || process.env.JWT_SECRET || "secret";

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

/* ========= 🚨 完美貼齊企劃書的會員分級邏輯 ========= */
function calcTier(totalSpent: number) {
  if (totalSpent >= 35000) return "UVVIP貴賓";
  if (totalSpent >= 10000) return "UVIP貴賓";
  if (totalSpent >= 6000) return "U金貴賓";
  if (totalSpent >= 2000) return "U銀貴賓";
  return "U銅貴賓"; // 註冊即為銅貴賓
}

function buildMembershipPayload(totalSpent12m: number) {
  const tierName = calcTier(totalSpent12m);
  let discountLabel = "無專屬折扣";
  let upgradeGift = 0;
  let birthdayCredit = 0;
  let nextTierName: string | null = null;
  let nextNeedAmount: number | null = null;

  // 💡 直接使用 switch 清晰定義每一階的福利，不留任何舊代碼殘骸
  switch (tierName) {
    case "U銅貴賓":
      discountLabel = "無專屬折扣";
      upgradeGift = 50;
      birthdayCredit = 100;
      nextTierName = "U銀貴賓";
      nextNeedAmount = Math.max(0, 2000 - totalSpent12m);
      break;
    case "U銀貴賓":
      discountLabel = "消費享 98 折";
      upgradeGift = 100;
      birthdayCredit = 200;
      nextTierName = "U金貴賓";
      nextNeedAmount = Math.max(0, 6000 - totalSpent12m);
      break;
    case "U金貴賓":
      discountLabel = "消費享 95 折";
      upgradeGift = 300;
      birthdayCredit = 300;
      nextTierName = "UVIP貴賓";
      nextNeedAmount = Math.max(0, 10000 - totalSpent12m);
      break;
    case "UVIP貴賓":
      discountLabel = "消費享 9 折";
      upgradeGift = 500;
      birthdayCredit = 500;
      nextTierName = "UVVIP貴賓";
      nextNeedAmount = Math.max(0, 35000 - totalSpent12m);
      break;
    case "UVVIP貴賓":
      discountLabel = "消費享 88 折";
      upgradeGift = 1000;
      birthdayCredit = 1000;
      break;
  }

  return { 
    tierName, 
    totalSpent12m, 
    discountLabel, 
    upgradeGift, 
    birthdayCredit, 
    nextTierName, 
    nextNeedAmount 
  };
}
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
      (sum, o) => sum + (parseFloat(o.total) || 0),
      0
    );

    const membership = buildMembershipPayload(totalSpent12m);

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
        avatar_url: customer.avatar_url,
        birthday: birthday,
      }
      : { email: normalizedEmail };

    return NextResponse.json(
      { loggedIn: true, customer: customerPayload, membership, isAdmin },
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

// ✅ PUT 方法：更新會員資料 (修復管理員找不到資料的問題)
export async function PUT(req: Request) {
  try {
    const auth = basicAuth();
    if (!auth) {
      return NextResponse.json({ ok: false, message: "Auth Error" }, { status: 500 });
    }

    const email = await getAuthenticatedEmail();
    if (!email) {
      return NextResponse.json(
        { ok: false, message: "尚未登入" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { birthday } = body;
    if (!birthday) {
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

    // 2. 檢查是否已設定過 (如果有 ID 的話)
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

    // 3. 執行動作：有 ID 則更新，無 ID 則建立
    if (customerId) {
      // === 情況 A: 更新現有會員 (包含管理員) ===
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
    } else {
      // === 情況 B: 自動建立新會員 (因為找不到 ID) ===
      console.log(`Creating new customer for ${normalizedEmail}`);

      const username = normalizedEmail.split('@')[0] + "_" + Math.floor(Math.random() * 1000);

      const createRes = await fetch(`${BASE}/wp-json/wc/v3/customers`, {
        method: "POST",
        headers: {
          Authorization: auth,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          username: username, // 必填，自動生成一個
          first_name: "會員", // 預設名稱，讓他之後自己改
          password: Math.random().toString(36).slice(-10) + "!Aa", // 生成隨機密碼
          meta_data: [
            { key: "birthday", value: birthday },
            { key: "billing_birth_date", value: birthday },
            { key: "_billing_birth_date", value: birthday }
          ],
        }),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        console.error("Create failed:", err);
        // 這裡如果不成功，可能是 Email 已存在但搜尋不到，或者密碼強度不足
        return NextResponse.json({ ok: false, message: err.message || "建立會員失敗，請聯繫客服" });
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