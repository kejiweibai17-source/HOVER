// src/app/api/admin/customers/route.ts
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
  // const session = await getServerSession(authOptions);
  // const adminEmails = parseAdminEmails();
  // const userEmail = String(session?.user?.email || "").trim().toLowerCase();
  // const isAdmin = !!userEmail && adminEmails.includes(userEmail);

  // if (!session || !isAdmin) {
  //   return NextResponse.json(
  //     { ok: false, message: "Forbidden" },
  //     { status: 403, headers: noCache }
  //   );
  // }
  return null;
}

function calcTier(totalSpent: number) {
  if (totalSpent >= 35000) return "VVIP 貴賓";
  if (totalSpent >= 10000) return "VIP 貴賓";
  if (totalSpent >= 6000) return "金貴賓";
  if (totalSpent >= 2000) return "銀貴賓";
  if (totalSpent > 0) return "銅貴賓";
  return "尚未消費";
}

function getMetaValue(meta: any[], key: string): any {
  return meta?.find((m) => m.key === key)?.value;
}

function parseRewardedList(val: any): number[] {
  try {
    const arr = JSON.parse(String(val || "[]"));
    return Array.isArray(arr) ? arr.map((x) => Number(x)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * ✅ 先用 customerId 查，若查不到，再用 billing email 查（避免訪客結帳 / 訂單未綁 customerId）
 */
async function fetchOrdersSummaryForCustomerOrEmail(
  customerId: number,
  email: string | undefined,
  auth: string
) {
  const safeEmail = String(email || "").trim().toLowerCase();

  // 1) by customer id
  try {
    const url = `${BASE}/wp-json/wc/v3/orders?customer=${customerId}&per_page=100&status=any&orderby=date&order=desc`;
    const res = await fetch(url, {
      headers: { Authorization: auth },
      cache: "no-store",
    });

    if (res.ok) {
      const batch = await res.json();
      if (Array.isArray(batch) && batch.length > 0) {
        let totalSpent = 0;
        batch.forEach((o: any) => (totalSpent += parseFloat(o.total) || 0));
        return {
          totalSpent,
          ordersCount: batch.length,
          lastOrderDate: batch[0]?.date_created || null,
        };
      }
    }
  } catch {}

  // 2) fallback by email (billing.email)
  if (!safeEmail) {
    return { totalSpent: 0, ordersCount: 0, lastOrderDate: null };
  }

  try {
    // Woo 的 search 會搜尋多欄位，回來後再用 billing.email 精準過濾
    const url = `${BASE}/wp-json/wc/v3/orders?per_page=100&status=any&orderby=date&order=desc&search=${encodeURIComponent(
      safeEmail
    )}`;
    const res = await fetch(url, {
      headers: { Authorization: auth },
      cache: "no-store",
    });

    if (!res.ok) return { totalSpent: 0, ordersCount: 0, lastOrderDate: null };

    const all = await res.json();
    const matched = Array.isArray(all)
      ? all.filter(
          (o: any) => String(o?.billing?.email || "").trim().toLowerCase() === safeEmail
        )
      : [];

    if (matched.length === 0) {
      return { totalSpent: 0, ordersCount: 0, lastOrderDate: null };
    }

    let totalSpent = 0;
    matched.forEach((o: any) => (totalSpent += parseFloat(o.total) || 0));

    return {
      totalSpent,
      ordersCount: matched.length,
      lastOrderDate: matched[0]?.date_created || null,
    };
  } catch {
    return { totalSpent: 0, ordersCount: 0, lastOrderDate: null };
  }
}

export async function GET() {
  const noCache = { "Cache-Control": "no-store, no-cache, must-revalidate" };

  try {
    const forbid = await assertAdmin(noCache);
    if (forbid) return forbid;

    const auth = basicAuth();
    if (!auth) {
      return NextResponse.json(
        { ok: false, message: "API 設定錯誤" },
        { status: 500, headers: noCache }
      );
    }

    const perPage = 50;
    let page = 1;
    const allCustomers: any[] = [];

    while (true) {
      const url = `${BASE}/wp-json/wc/v3/customers?per_page=${perPage}&page=${page}`;
      const res = await fetch(url, {
        headers: { Authorization: auth },
        cache: "no-store",
      });

      const batch = await res.json();
      if (!Array.isArray(batch) || batch.length === 0) break;
      allCustomers.push(...batch);
      if (batch.length < perPage) break;
      page++;
    }

    const referredCountMap: Record<number, number> = {};
    const rewardedCountMap: Record<number, number> = {};

    allCustomers.forEach((c) => {
      const meta = c.meta_data || [];
      const referredBy = Number(getMetaValue(meta, "uf_referred_by") || 0);
      if (referredBy)
        referredCountMap[referredBy] =
          (referredCountMap[referredBy] || 0) + 1;

      const rewardedOrders = parseRewardedList(
        getMetaValue(meta, "uf_ref_rewarded_orders")
      );
      if (rewardedOrders.length > 0)
        rewardedCountMap[c.id] = rewardedOrders.length;
    });

    const customers: any[] = [];

    for (const c of allCustomers) {
      let totalSpent = parseFloat(c.total_spent) || 0;
      let ordersCount = Number(c.orders_count) || 0;
      let lastOrderDate = c.date_last_order || null;

      // ✅ 更穩：只要其中一個為 0，或 lastOrderDate 缺，就走 fallback 校正（避免 Woo 欄位沒更新）
      if (totalSpent === 0 || ordersCount === 0 || !lastOrderDate) {
        const summary = await fetchOrdersSummaryForCustomerOrEmail(
          c.id,
          c.email,
          auth
        );

        // 有抓到就覆蓋（避免把原本正確值覆蓋成 0）
        if (summary.ordersCount > 0) {
          totalSpent = summary.totalSpent;
          ordersCount = summary.ordersCount;
          lastOrderDate = summary.lastOrderDate;
        }
      }

      customers.push({
        id: c.id,
        name: `${c.first_name} ${c.last_name}`.trim() || c.username,
        email: c.email,
        username: c.username,
        billingCity: c?.billing?.city || "",
        billingCountry: c?.billing?.country || "",

        totalSpent,
        ordersCount,
        lastOrderDate,

        tier: calcTier(totalSpent),

        referredCount: referredCountMap[c.id] || 0,
        rewardedCount: rewardedCountMap[c.id] || 0,
        referralEarned: (rewardedCountMap[c.id] || 0) * 200,
      });
    }

    return NextResponse.json({ ok: true, customers }, { headers: noCache });
  } catch (e) {
    console.error("/api/admin/customers error:", e);
    return NextResponse.json(
      { ok: false, message: "系統錯誤" },
      { status: 500, headers: noCache }
    );
  }
}
