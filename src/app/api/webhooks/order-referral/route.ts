// src/app/api/webhooks/order-referral/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const BASE = process.env.WC_API_BASE!;
const CK = process.env.WC_CONSUMER_KEY!;
const CS = process.env.WC_CONSUMER_SECRET!;

function basicAuth() {
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

function parseRewardedList(val: any): number[] {
  try {
    const arr = JSON.parse(String(val || "[]"));
    return Array.isArray(arr) ? arr.map((x) => Number(x)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function getMeta(meta: any[], key: string): string | null {
  const m = Array.isArray(meta) ? meta.find((x) => x?.key === key) : null;
  if (!m) return null;
  const v = m.value;
  if (v === undefined || v === null) return null;
  return String(v);
}

// ✅ 用 email 找 customer（處理訪客單 / customer_id=0）
async function getCustomerByEmail(email: string) {
  const authHeader = { Authorization: basicAuth() };
  const r = await fetch(
    `${BASE}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}`,
    { headers: authHeader, cache: "no-store" }
  );
  const arr = await r.json().catch(() => []);
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
}

// ✅ 取得 customer：優先 customer_id，不行就用 billing.email
async function getCustomerFromOrder(order: any) {
  const authHeader = { Authorization: basicAuth() };

  const customerId = Number(order?.customer_id || 0);
  if (customerId) {
    const cRes = await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
      headers: authHeader,
      cache: "no-store",
    });
    if (cRes.ok) return cRes.json();
  }

  const email = String(order?.billing?.email || "").trim().toLowerCase();
  if (!email) return null;

  return getCustomerByEmail(email);
}

async function getOrder(orderId: number | string) {
  const authHeader = { Authorization: basicAuth() };
  const r = await fetch(`${BASE}/wp-json/wc/v3/orders/${orderId}`, {
    headers: authHeader,
    cache: "no-store",
  });
  if (!r.ok) return null;
  return r.json();
}

// ✅ 「首單判斷」：
// - 若 order.customer_id 有值：用 customer 參數查
// - 若是訪客單 customer_id=0：用 billing.email 查同 email 訂單
async function isFirstValidOrder(order: any): Promise<boolean> {
  const authHeader = { Authorization: basicAuth() };
  const orderId = Number(order?.id || 0);
  const status = String(order?.status || "").toLowerCase();
  if (!orderId) return false;
  if (!["processing", "completed"].includes(status)) return false;

  const customerId = Number(order?.customer_id || 0);
  const email = String(order?.billing?.email || "").trim().toLowerCase();

  // 1) 會員單：用 customer 查
  if (customerId) {
    const r = await fetch(
      `${BASE}/wp-json/wc/v3/orders?customer=${customerId}&status=processing,completed&per_page=100&orderby=date&order=asc`,
      { headers: authHeader, cache: "no-store" }
    );
    const arr = (await r.json().catch(() => [])) as any[];
    const valid = Array.isArray(arr)
      ? arr.filter((o) =>
          ["processing", "completed"].includes(String(o?.status || "").toLowerCase())
        )
      : [];
    return valid.length > 0 && Number(valid[0]?.id) === orderId;
  }

  // 2) 訪客單：用 billing.email 查同 email 訂單（WC 支援 search=）
  if (!email) return false;
  const r2 = await fetch(
    `${BASE}/wp-json/wc/v3/orders?status=processing,completed&per_page=100&orderby=date&order=asc&search=${encodeURIComponent(
      email
    )}`,
    { headers: authHeader, cache: "no-store" }
  );
  const arr2 = (await r2.json().catch(() => [])) as any[];
  const sameEmailValid = Array.isArray(arr2)
    ? arr2.filter((o) => {
        const s = String(o?.status || "").toLowerCase();
        const e = String(o?.billing?.email || "").trim().toLowerCase();
        return ["processing", "completed"].includes(s) && e === email;
      })
    : [];

  return sameEmailValid.length > 0 && Number(sameEmailValid[0]?.id) === orderId;
}

export async function POST(req: Request) {
  try {
    const payload = await req.json().catch(() => null);

    const orderId = Number(payload?.id || payload?.resource?.id || 0);
    if (!orderId) return NextResponse.json({ ok: true });

    // 1) 撈訂單（以 Woo 最新狀態為準）
    const order = await getOrder(orderId);
    if (!order?.id) {
      console.log("[order-referral] fetch order failed", orderId);
      return NextResponse.json({ ok: true });
    }

    const status = String(order?.status || "").toLowerCase();
    console.log("[order-referral] got order", orderId, status);

    if (!["processing", "completed"].includes(status)) {
      console.log("[order-referral] skip status", orderId, status);
      return NextResponse.json({ ok: true });
    }

    // 2) 找到被推薦人的 customer（支援 guest：用 email 找 customer）
    const customer = await getCustomerFromOrder(order);
    if (!customer?.id) {
      console.log("[order-referral] no customer found for order", orderId);
      return NextResponse.json({ ok: true });
    }

    const customerId = Number(customer.id);
    const cMeta: any[] = Array.isArray(customer.meta_data) ? customer.meta_data : [];

    // 3) 找推薦人 id（uf_referred_by）
    const referredBy = Number(getMeta(cMeta, "uf_referred_by") || 0);
    if (!referredBy) {
      console.log("[order-referral] order not referred", orderId);
      return NextResponse.json({ ok: true });
    }

    // 4) 被推薦人是否已經發過「首單回饋」(避免重複)
    const alreadyFriendRewarded = (getMeta(cMeta, "uf_ref_first_order_rewarded") || "") === "1";
    if (alreadyFriendRewarded) {
      console.log("[order-referral] already rewarded friend", customerId);
      return NextResponse.json({ ok: true });
    }

    // 5) 首單判斷（支援訪客單：用 billing.email）
    const firstOk = await isFirstValidOrder(order);
    if (!firstOk) {
      console.log("[order-referral] not first valid order", customerId, orderId);
      return NextResponse.json({ ok: true });
    }

    // 6) 撈推薦人 customer（避免同訂單重發）
    const authHeader = { Authorization: basicAuth() };

    const aRes = await fetch(`${BASE}/wp-json/wc/v3/customers/${referredBy}`, {
      headers: authHeader,
      cache: "no-store",
    });
    if (!aRes.ok) {
      console.log("[order-referral] ambassador not found", referredBy);
      return NextResponse.json({ ok: true });
    }

    const ambassador = await aRes.json();
    const aMeta: any[] = Array.isArray(ambassador.meta_data) ? ambassador.meta_data : [];

    const rewardedOrders = parseRewardedList(getMeta(aMeta, "uf_ref_rewarded_orders"));
    if (rewardedOrders.includes(orderId)) {
      console.log("[order-referral] order already rewarded", orderId);
      return NextResponse.json({ ok: true });
    }

    // 7) 建立推薦人 200 coupon（一筆推薦一碼）
    const code = `UFAMB-${referredBy}-${customerId}-${orderId}`;
    const expires = new Date();
    expires.setMonth(expires.getMonth() + 6);

    // 先查是否存在，避免重複建立
    const existRes = await fetch(
      `${BASE}/wp-json/wc/v3/coupons?code=${encodeURIComponent(code)}`,
      { headers: authHeader, cache: "no-store" }
    );
    const existArr = await existRes.json().catch(() => []);
    if (Array.isArray(existArr) && existArr.length > 0) {
      console.log("[order-referral] coupon already exists", code);
      // 仍然把去重資料補上，避免下次又再進來
      rewardedOrders.push(orderId);
      await fetch(`${BASE}/wp-json/wc/v3/customers/${referredBy}`, {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          meta_data: [{ key: "uf_ref_rewarded_orders", value: JSON.stringify(rewardedOrders) }],
        }),
      });
      await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          meta_data: [{ key: "uf_ref_first_order_rewarded", value: "1" }],
        }),
      });
      return NextResponse.json({ ok: true });
    }

    const cCreateRes = await fetch(`${BASE}/wp-json/wc/v3/coupons`, {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        discount_type: "fixed_cart",
        amount: "200",
        individual_use: true,
        usage_limit: 1,
        usage_limit_per_user: 1,
        email_restrictions: [String(ambassador?.email || "").toLowerCase()],
        date_expires: expires.toISOString(),
        description: "金牌大使推薦首單回饋 200 元",
        meta_data: [
          { key: "uf_ref_ambassador_coupon", value: "1" },
          { key: "uf_referred_order_id", value: String(orderId) },
          { key: "uf_referred_customer_id", value: String(customerId) },
        ],
      }),
    });

    if (!cCreateRes.ok) {
      const errTxt = await cCreateRes.text().catch(() => "");
      console.log("[order-referral] create coupon failed", errTxt);
      return NextResponse.json({ ok: true });
    }

    console.log("[order-referral] coupon created", code);

    // 8) 寫入雙方 meta 去重
    rewardedOrders.push(orderId);

    await fetch(`${BASE}/wp-json/wc/v3/customers/${referredBy}`, {
      method: "PUT",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        meta_data: [{ key: "uf_ref_rewarded_orders", value: JSON.stringify(rewardedOrders) }],
      }),
    });

    await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
      method: "PUT",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        meta_data: [{ key: "uf_ref_first_order_rewarded", value: "1" }],
      }),
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("order referral webhook error:", e);
    return NextResponse.json({ ok: true });
  }
}
