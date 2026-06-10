"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// 修正：為參數 n 指定 number 類型
const currency = (n: number): string =>
  `NT$${(Math.round(n * 100) / 100).toLocaleString("zh-TW")}`;

// 建立內部組件處理邏輯
function ThankYouContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  // 修正：為 state 指定類型
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchOrder() {
      if (!orderId) {
        setLoading(false);
        return;
      }

      try {
        await new Promise((resolve) => setTimeout(resolve, 300));

        const host = window.location.origin;
        const res = await fetch(`${host}/api/orders/${orderId}`, {
          cache: "no-store",
        });

        if (res.ok) {
          const data = await res.json();
          setOrder(data);
        }
      } catch (err) {
        console.error("抓取訂單失敗", err);
      } finally {
        setLoading(false);
      }
    }

    fetchOrder();
  }, [orderId]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-6 px-4">
        <h1 className="text-2xl font-bold">訂單處理中...</h1>
        <p className="text-gray-600 text-center">
          若您剛完成付款，系統正在確認訂單狀態。
          <br />
          您可以稍後在「我的帳戶」中查看。
        </p>
        <a href="/" className="px-6 py-2 rounded bg-black text-white">
          回首頁
        </a>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center">
          <img src="/images/logo/logo-y.png" alt="UFLOW" className="h-7" />
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 pt-8 grid lg:grid-cols-12 gap-8">
        <section className="lg:col-span-8 space-y-6">
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <div className="text-sm text-gray-500">
                  訂單編號 #{order.id}
                </div>
                <h1 className="text-xl font-semibold">
                  付款成功，感謝您的訂購！
                </h1>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-700">
              確認信件已寄送至：<strong>{order.billing?.email}</strong>
            </p>
          </div>
          <div className="bg-white border rounded-xl p-5 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">配送資訊</h2>
            <div className="grid sm:grid-cols-2 gap-6 text-sm text-gray-600">
              <div>
                <p className="font-medium text-gray-900 mb-1">收件人</p>
                <p>
                  {order.billing?.first_name} {order.billing?.last_name}
                </p>
                <p>{order.billing?.phone}</p>
              </div>
              <div>
                <p className="font-medium text-gray-900 mb-1">配送地址</p>
                <p>
                  {order.billing?.city}
                  {order.billing?.address_1}
                </p>
              </div>
            </div>
          </div>
        </section>
        <aside className="lg:col-span-4">
          <div className="bg-white border rounded-xl p-5 shadow-sm sticky top-8">
            <h3 className="font-semibold mb-4">訂單摘要</h3>
            <div className="space-y-4 mb-5 border-b pb-5">
              {order.line_items?.map((it: any) => (
                <div key={it.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {it.name} x {it.quantity}
                  </span>
                  <span className="font-medium">
                    {currency(Number(it.total))}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center">
              <span>總計金額</span>
              <span className="text-lg font-bold">
                {currency(Number(order.total))}
              </span>
            </div>
            <a
              href="/"
              className="mt-6 block text-center px-4 py-3 rounded-lg bg-black text-white"
            >
              繼續購物
            </a>
          </div>
        </aside>
      </main>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          載入中...
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}
