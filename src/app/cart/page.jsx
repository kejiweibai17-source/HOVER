// app/cart/page.jsx

import CartPageClient from "./client";
import React from "react";

export const dynamic = "force-static";
export const revalidate = 60 * 60;

const getSiteUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_URL)
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return "http://localhost:3000";
};

const SITE_URL = getSiteUrl();

export const metadata = {
  title: "購物袋｜HOVER 威爾特",
  description: "查看您在 HOVER 服飾選購的商品，確認數量與金額後完成結帳。",
  keywords: ["HOVER", "服飾", "購物袋", "購物車", "結帳"],
  alternates: {
    canonical: `${SITE_URL}/cart`,
  },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/cart`,
    siteName: "HOVER 威爾特",
    title: "購物袋｜HOVER 威爾特",
    description:
      "查看您在 HOVER 服飾選購的商品，確認數量與金額後完成結帳。",
    images: [
      {
        url: "/images/hover/hero.jpg",
        width: 1600,
        height: 900,
        alt: "HOVER 購物袋",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "購物袋｜HOVER 威爾特",
    description:
      "查看您在 HOVER 服飾選購的商品，確認數量與金額後完成結帳。",
    images: ["/images/hover/hero.jpg"],
  },
};

export default function CartPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "購物袋｜HOVER 威爾特",
    description:
      "HOVER 官方購物袋頁面，在這裡確認商品明細、數量與小計金額，並進入結帳流程。",
    url: `${SITE_URL}/cart`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "首頁",
          item: `${SITE_URL}/`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "購物袋",
          item: `${SITE_URL}/cart`,
        },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <CartPageClient />
    </>
  );
}
