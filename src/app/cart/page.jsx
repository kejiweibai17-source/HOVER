// app/cart/page.jsx  （✅ 不要加 "use client"）

import CartPageClient from "./client"; // 預設匯入 client.jsx 的 default export
import React from "react";

// ✅ 讓這個 route 以 SSG / ISR 方式輸出 HTML
export const dynamic = "force-static"; // 強制靜態
export const revalidate = 60 * 60; // ISR：每 1 小時最多重新產一次

// ✅ SEO metadata（UFLOW 保健食品）
export const metadata = {
  title: "購物袋｜HOVER 服飾品牌",
  description:
    "查看您在 HOVER 服飾選購的商品，確認數量與金額後完成結帳。",
  keywords: [
    "HOVER",
    "服飾",
    "購物袋",
    "購物車",
    "結帳",
  ],
  alternates: {
    canonical: "https://example.com/cart", // ✅ 改成你的正式網域
  },
  openGraph: {
    type: "website",
    url: "https://example.com/cart", // ✅ 一樣改成你的網域
    siteName: "UFLOW 官方保健食品商城",
    title: "購物車｜UFLOW 官方保健食品商城",
    description:
      "確認 UFLOW 保健食品購物車中的商品與金額，享受安心、透明的線上結帳流程。",
    images: [
      {
        url: "https://example.com/og/uflow-cart.jpg", // 可放品牌主視覺
        width: 1200,
        height: 630,
        alt: "UFLOW 保健食品購物車畫面",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "購物車｜UFLOW 官方保健食品商城",
    description: "查看 UFLOW 保健食品購物車中的商品明細，輕鬆完成結帳流程。",
    images: ["https://example.com/og/uflow-cart.jpg"],
  },
};

export default function CartPage() {
  // ✅ JSON-LD 結構化資料（讓搜尋引擎更懂這頁是在做什麼）
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "購物車｜UFLOW 官方保健食品商城",
    description:
      "UFLOW 官方保健食品商城購物車頁面，在這裡確認商品明細、數量與小計金額，並進入結帳流程。",
    url: "https://example.com/cart", // 改成你的網域
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "首頁",
          item: "https://example.com/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "購物車",
          item: "https://example.com/cart",
        },
      ],
    },
  };

  return (
    <>
      {/* ✅ 結構化資料：會直接輸出在 SSR HTML 裡，蜘蛛一進來就看得到 */}
      <script
        type="application/ld+json"
        // 注意：要轉成字串
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ✅ 真正的互動式購物車畫面（client component） */}
      <CartPageClient />
    </>
  );
}
