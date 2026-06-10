// app/products/page.tsx
import Client from "./Client";
import Script from "next/script";
import type { Metadata } from "next";
import { MOCK_PRODUCTS } from "@/lib/mockProducts";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// 1. 完整的 SEO Metadata 設定
export const metadata: Metadata = {
  title: "所有商品｜HOVER 服飾品牌",
  description:
    "瀏覽 HOVER 全系列服飾，包含上衣、帽子、褲子、包袋等，不被性別框架限制的日常穿搭。",
  keywords: ["HOVER", "服飾", "穿搭", "日常", "帽T", "短袖", "包袋"],
  alternates: {
    canonical: `${SITE_URL}/products`,
  },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    title: "所有商品｜HOVER 服飾品牌",
    description: "瀏覽 HOVER 全系列服飾，為日常穿搭帶來更多可能。",
    url: `${SITE_URL}/products`,
    siteName: "HOVER",
  },
  twitter: {
    card: "summary_large_image",
    title: "所有商品｜HOVER 服飾品牌",
    description: "瀏覽 HOVER 全系列服飾，為日常穿搭帶來更多可能。",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function ProductsPage() {
  const items = MOCK_PRODUCTS;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}/products/${product.slug}`,
      name: product.name,
      image: product.images?.[0]?.src || "",
      offers: {
        "@type": "Offer",
        priceCurrency: "TWD",
        price: product.price,
      },
    })),
  };

  return (
    <>
      {/* 注入結構化資料 */}
      <Script
        id="json-ld-products"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 渲染 Client Component */}
      <Client items={items} />
    </>
  );
}
