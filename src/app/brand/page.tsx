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
const BRAND_IMAGE = "/images/brand/280d8452-422a-4056-a5db-bea5277f5f5e.png";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "品牌故事｜HOVER 威爾特",
  description:
    "HOVER相信真正的風格，不是被定義，而是回到自己。我們不追逐流行，只願找到屬於自己的經典。",
  alternates: { canonical: "/brand" },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: "/brand",
    siteName: "HOVER 威爾特",
    title: "品牌故事｜HOVER 威爾特",
    description:
      "HOVER相信真正的風格，不是被定義，而是回到自己。",
    images: [
      {
        url: BRAND_IMAGE,
        width: 1920,
        height: 1080,
        alt: "HOVER 品牌故事",
      },
    ],
  },
};

export default function BrandPage() {
  return <Client />;
}
