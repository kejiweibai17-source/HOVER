// app/api/account/orders/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import jwt from "jsonwebtoken"; // 💡 新增：用來解析 LINE 登入的 Token
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BASE =
  process.env.WC_API_BASE || "https://inf.fjg.mybluehost.me/website_4ad5d5f2";
const CK = process.env.WC_CONSUMER_KEY;
const CS = process.env.WC_CONSUMER_SECRET;
// 💡 新增：用來解密 Token 的金鑰
const JWT_SECRET = process.env.RESET_TOKEN_SECRET || process.env.JWT_SECRET || "secret";

function basicAuth() {
  if (!CK || !CS) return undefined;
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

function extractPaymentDetails(metaData: any[]) {
  const info: any = {};
  if (!Array.isArray(metaData)) return undefined;

  metaData.forEach((item: any) => {
    const key = String(item.key || "").toLowerCase();
    const val = Array.isArray(item.value) ? String(item.value[0]) : String(item.value || "");

    if (key.includes("vaccount") || key.includes("virtual_account") || key.includes("atm_account")) info.atm_account = val;
    if (key.includes("bankcode") || key.includes("bank_code") || key.includes("atm_bank")) info.bank_code = val;
    if (key.includes("paymentno") || key.includes("cvs_payment") || key.includes("cvscode")) info.cvs_code = val;
    if (key.includes("expiredate") || key.includes("expire_date") || key.includes("duedate")) info.expire_date = val;
  });

  return Object.keys(info).length > 0 ? info : undefined;
}

// 強化搜尋邏輯
async function fetchAllUserOrders(auth: string, customerId: number | null, email: string | null, debugInfo: any) {
  let allOrders: any[] = [];
  const safeEmail = String(email || "").trim().toLowerCase();

  debugInfo.search_params = { customerId, safeEmail };

  // 1. 用 Customer ID 搜尋
  if (customerId) {
    const url = `${BASE}/wp-json/wc/v3/orders?customer=${customerId}&per_page=50&orderby=date&order=desc&status=any`;
    try {
      const res = await fetch(url, { headers: { Authorization: auth }, cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) allOrders = [...data];
      }
    } catch (e: any) {}
  }

  // 2. 用 Email 搜尋
  if (safeEmail) {
    const url = `${BASE}/wp-json/wc/v3/orders?search=${encodeURIComponent(safeEmail)}&per_page=50&orderby=date&order=desc&status=any`;
    try {
      const res = await fetch(url, { headers: { Authorization: auth }, cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          data.forEach((o) => {
            if (!allOrders.find((existing) => existing.id === o.id)) allOrders.push(o);
          });
        }
      }
    } catch (e: any) {}
  }

  // 3. 終極暴力掃描：直接抓最近 10 筆訂單比對 Email
  if (allOrders.length === 0 && safeEmail) {
    const url = `${BASE}/wp-json/wc/v3/orders?per_page=10&orderby=date&order=desc&status=any`;
    try {
      const res = await fetch(url, { headers: { Authorization: auth }, cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const matched = data.filter((o:any) => String(o?.billing?.email || "").trim().toLowerCase() === safeEmail);
        matched.forEach((o:any) => {
          if (!allOrders.find((existing) => existing.id === o.id)) allOrders.push(o);
        });
      }
    } catch (e: any) {}
  }

  // 過濾，確保結果確實屬於這個人
  const finalOrders = allOrders.filter((o) => {
    const isMatchedById = customerId && o.customer_id === customerId;
    const oEmail = String(o?.billing?.email || "").trim().toLowerCase();
    const isMatchedByEmail = safeEmail && oEmail === safeEmail;
    return isMatchedById || isMatchedByEmail;
  });

  return finalOrders.sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime());
}

export async function GET() {
  const noCache = { "Cache-Control": "no-store, no-cache, must-revalidate" };
  const debugInfo: any = {};

  try {
    const auth = basicAuth();
    if (!auth) return NextResponse.json({ ok: true, orders: [], debug: "No Auth" }, { headers: noCache });

    const session = await getServerSession(authOptions);
    const cookieStore = cookies();
    const authMethod = String(
      cookieStore.get("hover_auth_method")?.value || "",
    ).toLowerCase();

    let email: string | null = null;

    const readAuthTokenEmail = () => {
      const authToken = cookieStore.get("auth_token")?.value;
      if (!authToken) return null;
      try {
        const decoded = jwt.verify(authToken, JWT_SECRET) as any;
        return decoded?.email ? String(decoded.email) : null;
      } catch {
        debugInfo.jwt_error = "auth_token verify failed";
        return null;
      }
    };

    if (authMethod === "line" || authMethod === "facebook" || authMethod === "email") {
      email = readAuthTokenEmail();
    }
    if (!email) email = session?.user?.email || null;
    if (!email) email = cookieStore.get("user_email")?.value || null;
    if (!email) email = readAuthTokenEmail();

    let wpUserId: number | null = null;
    const wpJwt = cookieStore.get("jwt")?.value;
    
    if (wpJwt) {
      try {
        const meRes = await fetch(`${BASE}/wp-json/wp/v2/users/me`, {
          headers: { Authorization: `Bearer ${wpJwt}`, "Content-Type": "application/json" },
          cache: "no-store",
        });
        if (meRes.ok) {
          const me = await meRes.json();
          wpUserId = typeof me?.id === "number" ? me.id : null;
          if (!email && me?.email) email = me.email;
        }
      } catch (e) {}
    }

    debugInfo.detected_email = email;
    debugInfo.detected_wp_user_id = wpUserId;

    if (!email && !wpUserId) {
       return NextResponse.json({ ok: true, orders: [], debug: debugInfo }, { headers: noCache });
    }

    const normalizedEmail = email ? email.trim().toLowerCase() : null;
    let customerId: number | null = null;

    if (wpUserId) {
      try {
        const byIdRes = await fetch(`${BASE}/wp-json/wc/v3/customers/${wpUserId}`, { headers: { Authorization: auth }, cache: "no-store" });
        if (byIdRes.ok) {
          const c = await byIdRes.json();
          if (c && c.id) customerId = c.id;
        }
      } catch (e) {}
    }

    if (!customerId && normalizedEmail) {
      try {
        const cRes = await fetch(`${BASE}/wp-json/wc/v3/customers?email=${encodeURIComponent(normalizedEmail)}&role=all`, { headers: { Authorization: auth }, cache: "no-store" });
        if (cRes.ok) {
          const customers = (await cRes.json().catch(() => [])) as any[];
          if (Array.isArray(customers) && customers.length > 0) customerId = customers[0].id;
        }
      } catch (e) {}
    }

    debugInfo.resolved_customer_id = customerId;

    const ordersRaw = await fetchAllUserOrders(auth, customerId, normalizedEmail, debugInfo);
    const productIds = Array.from(
      new Set(
        ordersRaw.flatMap((order: any) =>
          (order.line_items || [])
            .map((item: any) => Number(item.product_id || 0))
            .filter(Boolean),
        ),
      ),
    );
    const productImages = new Map<number, string>();

    if (productIds.length > 0) {
      try {
        const productRes = await fetch(
          `${BASE}/wp-json/wc/v3/products?include=${productIds.join(",")}&per_page=100`,
          { headers: { Authorization: auth }, cache: "no-store" },
        );
        if (productRes.ok) {
          const products = await productRes.json();
          for (const product of products || []) {
            const src = product?.images?.[0]?.src;
            if (product?.id && src) productImages.set(Number(product.id), src);
          }
        }
      } catch {
        // Product images are optional; order data should still render.
      }
    }

    const orders = ordersRaw.map((o: any) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      date_created: o.date_created,
      date_paid: o.date_paid || o.date_completed || null,
      total: o.total,
      currency: o.currency,
      payment_method_title: o.payment_method_title || "標準支付",
      customer_note: o.customer_note || "",
      billing: o.billing || {},
      shipping: o.shipping || {},
      shipping_total: o.shipping_total || "0",
      discount_total: o.discount_total || "0",
      shipping_lines: (o.shipping_lines || []).map((line: any) => ({
        method_title: line.method_title || "",
        total: line.total || "0",
      })),
      coupon_lines: (o.coupon_lines || []).map((line: any) => ({
        code: line.code || "",
        discount: line.discount || "0",
      })),
      payment_info: extractPaymentDetails(o.meta_data || []),
      meta_data: o.meta_data || [],
      line_items: (o.line_items || []).map((it: any) => ({
        name: it.name,
        quantity: it.quantity,
        total: it.total,
        subtotal: it.subtotal,
        price: it.price,
        image:
          it.image?.src ||
          productImages.get(Number(it.product_id || 0)) ||
          "",
        product_id: it.product_id || 0,
        sku: it.sku || "",
        variation_id: it.variation_id || 0,
        meta_data: (it.meta_data || [])
          .filter((meta: any) => meta?.display_key && meta?.display_value)
          .map((meta: any) => ({
            key: meta.display_key,
            value: meta.display_value,
          })),
      })),
    }));

    return NextResponse.json({ ok: true, orders, debug: debugInfo }, { headers: noCache });
  } catch (e: any) {
    return NextResponse.json({ ok: true, orders: [], debug: `Fatal Error: ${e.message}` }, { headers: noCache });
  }
}