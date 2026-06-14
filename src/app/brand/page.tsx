import { Metadata } from "next";
import Client from "./client";

export const revalidate = 60;

const getSiteUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_URL)
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return "http://localhost:3000";
};

const SITE_URL = getSiteUrl();

const brandFAQs = [
  {
    question: "HOVER 的品牌理念是什麼？",
    answer:
      "我們相信日常穿搭應該舒適、簡約且實穿。HOVER 精選兼具質感與機能的服飾單品，讓你在每一天的生活節奏中，自在表現個人風格。",
  },
  {
    question: "商品如何配送？",
    answer:
      "全館單筆滿 NT$2,000 享免運。現貨商品一般於訂單確認後 1–3 個工作天內出貨，實際配送時間依物流狀況為準。",
  },
  {
    question: "如何聯絡客服？",
    answer:
      "可透過網站聯絡我們頁面留言，或來信 service@hoverofficial.com，我們將於營業時間內盡快回覆。",
  },
];

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "品牌故事｜HOVER 威爾特",
  description:
    "了解 HOVER 的品牌理念——在輕盈與穩定之間，找到屬於你的日常穿搭風格。",
  alternates: { canonical: "/brand" },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: "/brand",
    siteName: "HOVER 威爾特",
    title: "品牌故事｜HOVER 威爾特",
    description:
      "了解 HOVER 的品牌理念——在輕盈與穩定之間，找到屬於你的日常穿搭風格。",
    images: [
      {
        url: "/images/hover/brand-story.jpg",
        width: 1200,
        height: 800,
        alt: "HOVER 品牌故事",
      },
    ],
  },
};

export default function BrandPage() {
  return <Client faqs={brandFAQs} />;
}
