"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
import { LineChart, BarChart } from "@mui/x-charts";

type AdminCustomer = {
  id: number;
  name: string;
  email: string;
  username?: string;
  createdAt?: string;
  lastOrderDate?: string;
  totalSpent: number;
  ordersCount: number;
  tier: string;
  billingCity?: string;
  billingCountry?: string;

  // ✅ referral stats from API
  referredCount: number; // 推薦註冊人數
  rewardedCount: number; // 成功首單數
  referralEarned: number; // 已賺推薦金
};

type AdminOrder = {
  id: number;
  number: string;
  status: string;
  total: number;
  currency: string;
  date_created: string;
  line_items: { name: string; quantity: number }[];
};

/* 小工具：金額格式 */
const formatNTD = (val: number) =>
  "NT$" + Math.round(val || 0).toLocaleString("zh-TW");

/* ========== 會員分析圖表元件（使用 MUI X Charts） ========== */
function MemberAnalytics({
  orders,
  customer,
}: {
  orders: AdminOrder[];
  customer: AdminCustomer;
}) {
  if (!orders || orders.length === 0) {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-500">
        尚無足夠訂單資料可供分析。
      </div>
    );
  }

  const totalAmount = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const orderCount = orders.length;
  const avgAmount = orderCount > 0 ? totalAmount / orderCount : 0;

  const monthLabels: string[] = [];
  const monthTotalsMap: Record<string, number> = {};

  orders.forEach((o) => {
    const d = new Date(o.date_created);
    if (isNaN(d.getTime())) return;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
    if (!monthLabels.includes(key)) monthLabels.push(key);
    monthTotalsMap[key] = (monthTotalsMap[key] || 0) + (o.total || 0);
  });

  monthLabels.sort();
  const monthTotals = monthLabels.map((m) => monthTotalsMap[m] || 0);

  const productMap: Record<string, number> = {};
  orders.forEach((o) =>
    o.line_items.forEach((it) => {
      productMap[it.name] = (productMap[it.name] || 0) + (it.quantity || 0);
    })
  );

  const productEntries = Object.entries(productMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const productLabels = productEntries.map(([name]) => name);
  const productQty = productEntries.map(([, q]) => q);

  return (
    <div className="mt-4 space-y-3">
      {/* 指標卡片 */}
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-lg border bg-white px-3 py-2">
          <div className="text-[11px] text-slate-500">訂單數</div>
          <div className="mt-1 text-lg font-semibold text-slate-800">
            {orderCount}
          </div>
        </div>
        <div className="rounded-lg border bg-white px-3 py-2">
          <div className="text-[11px] text-slate-500">累計消費</div>
          <div className="mt-1 text-lg font-semibold text-slate-800">
            {formatNTD(totalAmount)}
          </div>
        </div>
        <div className="rounded-lg border bg-white px-3 py-2">
          <div className="text-[11px] text-slate-500">平均客單價</div>
          <div className="mt-1 text-lg font-semibold text-slate-800">
            {orderCount === 0 ? "—" : formatNTD(avgAmount)}
          </div>
        </div>

        {/* ✅ referral cards */}
        <div className="rounded-lg border bg-white px-3 py-2">
          <div className="text-[11px] text-slate-500">推薦註冊人數</div>
          <div className="mt-1 text-lg font-semibold text-amber-700">
            {customer.referredCount || 0}
          </div>
        </div>
        <div className="rounded-lg border bg-white px-3 py-2">
          <div className="text-[11px] text-slate-500">成功首單推薦</div>
          <div className="mt-1 text-lg font-semibold text-amber-700">
            {customer.rewardedCount || 0}
          </div>
        </div>
        <div className="rounded-lg border bg-white px-3 py-2">
          <div className="text-[11px] text-slate-500">已賺推薦金</div>
          <div className="mt-1 text-lg font-semibold text-amber-700">
            {formatNTD(customer.referralEarned || 0)}
          </div>
        </div>
      </div>

      {/* 圖表：左右兩塊 */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-lg border bg-white px-3 py-2">
          <div className="mb-1 text-[11px] font-semibold text-slate-600">
            每月消費金額趨勢
          </div>
          {monthLabels.length === 0 ? (
            <p className="text-xs text-slate-400">尚無可用的時間序列資料。</p>
          ) : (
            <div className="h-52">
              <LineChart
                xAxis={[
                  { scaleType: "point", data: monthLabels, label: "月份" },
                ]}
                series={[
                  {
                    data: monthTotals,
                    label: "消費金額",
                    valueFormatter: (v) => formatNTD(Number(v)),
                  },
                ]}
                margin={{ left: 40, right: 10, top: 20, bottom: 30 }}
              />
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-white px-3 py-2">
          <div className="mb-1 text-[11px] font-semibold text-slate-600">
            最常購買商品 TOP 5
          </div>
          {productLabels.length === 0 ? (
            <p className="text-xs text-slate-400">尚無商品統計資料。</p>
          ) : (
            <div className="h-52">
              <BarChart
                layout="horizontal"
                xAxis={[{ label: "購買次數 / 數量" }]}
                yAxis={[{ scaleType: "band", data: productLabels }]}
                series={[{ data: productQty, label: "數量" }]}
                margin={{ left: 80, right: 10, top: 20, bottom: 30 }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ========== 主頁面（Client） ========== */
export default function AdminMembersClient() {
  const [data, setData] = useState<AdminCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/admin/customers", { cache: "no-store" });
        const js = await res.json();
        if (!res.ok || !js.ok) throw new Error(js.message || "讀取失敗");
        setData(js.customers || []);
      } catch (e: any) {
        setError(e.message || "讀取失敗");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    const keyword = q.trim().toLowerCase();
    if (!keyword) return data;
    return data.filter(
      (c) =>
        c.name.toLowerCase().includes(keyword) ||
        c.email.toLowerCase().includes(keyword) ||
        (c.username || "").toLowerCase().includes(keyword)
    );
  }, [q, data]);

  const totalMembers = data.length;
  const totalRevenue = data.reduce((s, c) => s + c.totalSpent, 0);
  const totalReferred = data.reduce((s, c) => s + (c.referredCount || 0), 0);
  const totalReferralEarned = data.reduce(
    (s, c) => s + (c.referralEarned || 0),
    0
  );

  const toggleExpand = async (customerId: number) => {
    if (expandedId === customerId) {
      setExpandedId(null);
      return;
    }

    setExpandedId(customerId);
    setOrders([]);
    setOrdersError("");
    setOrdersLoading(true);

    try {
      const res = await fetch(
        `/api/admin/customer-orders?customerId=${customerId}`,
        { cache: "no-store" }
      );
      const js = await res.json();
      if (!res.ok || !js.ok) throw new Error(js.message || "讀取訂單失敗");
      setOrders(js.orders || []);
    } catch (e: any) {
      setOrders([]);
      setOrdersError(e.message || "讀取訂單失敗");
    } finally {
      setOrdersLoading(false);
    }
  };

  const renderOrders = () => {
    if (ordersLoading) {
      return <p className="text-xs text-slate-500 py-2">載入訂單中…</p>;
    }
    if (ordersError) {
      return <p className="text-xs text-rose-600 py-2">{ordersError}</p>;
    }
    if (orders.length === 0) {
      return <p className="text-xs text-slate-500 py-2">目前尚無任何訂單。</p>;
    }

    return (
      <div className="mt-1 rounded-lg border bg-slate-50">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-100 text-slate-500">
            <tr>
              <th className="px-3 py-1 text-left">訂單編號</th>
              <th className="px-3 py-1 text-left">日期</th>
              <th className="px-3 py-1 text-left">狀態</th>
              <th className="px-3 py-1 text-right">金額</th>
              <th className="px-3 py-1 text-left">品項</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-t last:border-b">
                <td className="px-3 py-1 align-top">#{o.number}</td>
                <td className="px-3 py-1 align-top">
                  {new Date(o.date_created).toLocaleString("zh-TW")}
                </td>
                <td className="px-3 py-1 align-top">{o.status}</td>
                <td className="px-3 py-1 align-top text-right">
                  {formatNTD(o.total)}
                </td>
                <td className="px-3 py-1 align-top">
                  {o.line_items.slice(0, 3).map((it, idx) => (
                    <span key={idx} className="mr-2">
                      {it.name} × {it.quantity}
                    </span>
                  ))}
                  {o.line_items.length > 3 && <span>…</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 py-20 mt-20 px-4">
      <div className="mx-auto max-w-6xl">
        {/* 頂部標題 + 統計 */}
        <header className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">會員總覽</h1>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <div className="rounded-xl bg-white px-4 py-2 shadow-sm border">
              <div className="text-xs text-slate-500">會員數</div>
              <div className="text-lg font-semibold">{totalMembers}</div>
            </div>
            <div className="rounded-xl bg-white px-4 py-2 shadow-sm border">
              <div className="text-xs text-slate-500">累計消費總額</div>
              <div className="text-lg font-semibold">
                {formatNTD(totalRevenue)}
              </div>
            </div>

            {/* ✅ referral totals */}
            <div className="rounded-xl bg-white px-4 py-2 shadow-sm border">
              <div className="text-xs text-slate-500">全站推薦註冊數</div>
              <div className="text-lg font-semibold text-amber-700">
                {totalReferred}
              </div>
            </div>
            <div className="rounded-xl bg-white px-4 py-2 shadow-sm border">
              <div className="text-xs text-slate-500">全站推薦金支出</div>
              <div className="text-lg font-semibold text-amber-700">
                {formatNTD(totalReferralEarned)}
              </div>
            </div>
          </div>
        </header>

        {/* 搜尋列 */}
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <div className="relative w-full max-w-sm">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜尋姓名 / Email / 使用者名稱…"
              className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-900/10"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
              Enter 搜尋
            </span>
          </div>
          <div className="text-xs text-slate-500">
            顯示 {filtered.length} / {data.length} 筆
          </div>
        </div>

        {loading && (
          <div className="mt-10 flex justify-center text-slate-500">
            載入中…
          </div>
        )}

        {!loading && error && (
          <div className="mt-6 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-[#F58A9C] text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-slate-50 text-left">會員</th>
                  <th className="px-4 py-2 text-slate-50 text-left">Email</th>
                  <th className="px-4 py-2 text-slate-50 text-left">城市</th>
                  <th className="px-4 py-2 text-slate-50 text-right">訂單數</th>
                  <th className="px-4 py-2 text-slate-50 text-right">
                    累計消費
                  </th>

                  {/* ✅ new columns */}
                  <th className="px-4 py-2 text-slate-50 text-right">
                    推薦註冊
                  </th>
                  <th className="px-4 py-2 text-slate-50 text-right">推薦金</th>

                  <th className="px-4 py-2 text-slate-50 text-center">
                    會員等級
                  </th>
                  <th className="px-4 py-2 text-slate-50 text-left">
                    最近訂購
                  </th>
                </tr>
              </thead>

              <tbody>
                {filtered.map((c) => (
                  <Fragment key={c.id}>
                    <tr
                      className="border-t last:border-b hover:bg-slate-50/80 cursor-pointer"
                      onClick={() => toggleExpand(c.id)}
                    >
                      <td className="px-4 py-2 align-middle">
                        <div className="font-medium text-slate-800">
                          {c.name || "—"}
                        </div>
                        {c.username && (
                          <div className="text-xs text-slate-500">
                            @{c.username}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-2 align-middle text-slate-700">
                        {c.email}
                      </td>
                      <td className="px-4 py-2 align-middle text-slate-700">
                        {c.billingCountry || ""} {c.billingCity || ""}
                      </td>
                      <td className="px-4 py-2 align-middle text-right">
                        {c.ordersCount}
                      </td>
                      <td className="px-4 py-2 align-middle text-right">
                        {formatNTD(c.totalSpent)}
                      </td>

                      {/* ✅ referral columns */}
                      <td className="px-4 py-2 align-middle text-right text-amber-700 font-semibold">
                        {c.referredCount || 0}
                      </td>
                      <td className="px-4 py-2 align-middle text-right text-amber-700 font-semibold">
                        {formatNTD(c.referralEarned || 0)}
                      </td>

                      <td className="px-4 py-2 align-middle text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            c.tier.includes("VVIP")
                              ? "bg-purple-100 text-purple-700"
                              : c.tier.includes("UVIP")
                              ? "bg-indigo-100 text-indigo-700"
                              : c.tier.includes("金")
                              ? "bg-amber-100 text-amber-700"
                              : c.tier.includes("銀")
                              ? "bg-slate-100 text-slate-700"
                              : c.tier.includes("銅")
                              ? "bg-orange-100 text-orange-700"
                              : "bg-slate-50 text-slate-400"
                          }`}
                        >
                          {c.tier}
                        </span>
                      </td>

                      <td className="px-4 py-2 align-middle text-xs text-slate-500">
                        {c.lastOrderDate
                          ? new Date(c.lastOrderDate).toLocaleDateString(
                              "zh-TW"
                            )
                          : "—"}
                      </td>
                    </tr>

                    {expandedId === c.id && (
                      <tr className="bg-slate-50/40">
                        <td colSpan={9} className="px-4 pb-3 pt-0">
                          <div className="pt-2 text-xs text-slate-500 mb-1">
                            會員訂單明細
                          </div>
                          {renderOrders()}

                          {/* ✅ pass customer into analytics */}
                          <MemberAnalytics orders={orders} customer={c} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}

                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={9}
                      className="px-4 py-6 text-center text-sm text-slate-500"
                    >
                      找不到符合條件的會員。
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
