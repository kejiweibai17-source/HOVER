// src/app/api/admin/customer-orders/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BASE =
  process.env.WC_API_BASE || "https://inf.fjg.mybluehost.me/website_4ad5d5f2";
const CK = process.env.WC_CONSUMER_KEY;
const CS = process.env.WC_CONSUMER_SECRET;

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

async function assertAdmin(noCache: Record<string, string>) {
  // 保持你原本的註解邏輯
  return null;
}

// 💡 1. 補上：提取付款資訊的超強模糊比對函式
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

async function fetchOrdersByCustomerOrEmail(
  auth: string,
  customerId: string,
  email?: string | null
) {
  try {
    const res = await fetch(
      `${BASE}/wp-json/wc/v3/orders?customer=${customerId}&per_page=50&orderby=date&order=desc&status=any`,
      { headers: { Authorization: auth }, cache: "no-store" }
    );
    if (res.ok) {
      const raw = (await res.json()) as any[];
      if (Array.isArray(raw) && raw.length > 0) return raw;
    }
  } catch {}

  const safeEmail = String(email || "").trim().toLowerCase();
  if (!safeEmail) return [];

  const res2 = await fetch(
    `${BASE}/wp-json/wc/v3/orders?per_page=50&orderby=date&order=desc&status=any&search=${encodeURIComponent(
      safeEmail
    )}`,
    { headers: { Authorization: auth }, cache: "no-store" }
  );

  if (!res2.ok) return [];
  const all = (await res2.json()) as any[];

  const matched = Array.isArray(all)
    ? all.filter(
        (o: any) =>
          String(o?.billing?.email || "").trim().toLowerCase() === safeEmail
      )
    : [];

  return matched;
}

export async function GET(req: Request) {
  const noCache = { "Cache-Control": "no-store, no-cache, must-revalidate" };

  try {
    const forbid = await assertAdmin(noCache);
    if (forbid) return forbid;

    const url = new URL(req.url);
    const customerId = url.searchParams.get("customerId");
    const email = url.searchParams.get("email");

    if (!customerId) {
      return NextResponse.json(
        { ok: false, message: "缺少 customerId" },
        { status: 400, headers: noCache }
      );
    }

    const auth = basicAuth();
    if (!auth) {
      return NextResponse.json(
        { ok: false, message: "WooCommerce API 尚未設定 CK/CS" },
        { status: 500, headers: noCache }
      );
    }

    const raw = await fetchOrdersByCustomerOrEmail(auth, customerId, email);

    // 💡 2. 修正：保留完整的 meta_data、customer_note 與 payment_info
    const orders = raw.map((o) => ({
      id: o.id,
      number: o.number,
      status: o.status,
      total: parseFloat(o.total || "0"),
      currency: o.currency,
      date_created: o.date_created,
      payment_method_title: o.payment_method_title || "標準支付",
      customer_note: o.customer_note || "",
      payment_info: extractPaymentDetails(o.meta_data || []),
      meta_data: o.meta_data || [],
      line_items: (o.line_items || []).map((li: any) => ({
        name: li.name,
        quantity: li.quantity,
      })),
    }));

    return NextResponse.json({ ok: true, orders }, { headers: noCache });
  } catch (e) {
    console.error("/api/admin/customer-orders error:", e);
    return NextResponse.json(
      { ok: false, message: "系統錯誤" },
      { status: 500, headers: noCache }
    );
  }
}