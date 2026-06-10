// app/thank-you/page.jsx (或 page.tsx)
"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ShoppingBag, FileText } from "lucide-react";

// 1. 內容元件：負責讀取網址參數
function ThankYouContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6 pb-20">
      <div className="max-w-md w-full bg-white border mt-20 border-gray-100  shadow-emerald-900/5  p-10 text-center animate-in zoom-in-95 duration-500">
        {/* 成功圖示 */}
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center relative">
            <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-20"></div>
            <CheckCircle2 className="w-12 h-12 text-[#008060]" />
          </div>
        </div>

        <h1 className="text-3xl font-black text-gray-900 mb-3 tracking-tight">
          付款成功！
        </h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          感謝您的購買，我們已收到您的訂單。
          <br />
          商品將於 2-3 個工作日內為您安排出貨。
        </p>

        {/* 訂單資訊卡片 */}
        <div className="bg-gray-50 rounded-2xl p-6 mb-8 border border-gray-100 text-left">
          <div className="flex justify-between items-end mb-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              訂單編號
            </p>
            <p className="text-xl font-black text-[#008060]">
              {orderId ? `#${orderId}` : "處理中..."}
            </p>
          </div>

          <div className="border-t border-gray-200/60 pt-4 flex items-start gap-2 text-gray-500">
            <FileText className="w-4 h-4 mt-0.5 shrink-0" />
            <p className="text-xs leading-relaxed">
              電子發票已為您開立，將發送至您的結帳信箱，請留意查收。
            </p>
          </div>
        </div>

        {/* 按鈕區塊 */}
        <div className="flex flex-col gap-3">
          <a
            href="/account"
            className="block w-full py-4 bg-[#008060] text-white rounded-xl font-bold hover:bg-[#006e52] hover:shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <ShoppingBag className="w-4 h-4" /> 查看訂單狀態
          </a>
          <a
            href="/"
            className="block w-full py-4 bg-white border-2 border-gray-100 text-gray-600 rounded-xl font-bold hover:border-gray-200 hover:bg-gray-50 transition-all active:scale-95"
          >
            繼續購物
          </a>
        </div>
      </div>
    </div>
  );
}

// 2. 主頁面：加上 Suspense (這是 Next.js 規範，為了避免 useSearchParams 報錯)
export default function ThankYouPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-[#008060] rounded-full animate-spin" />
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}
