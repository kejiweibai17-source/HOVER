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
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "品牌故事｜HOVER",
  description:
    "了解 HOVER 品牌故事。我們相信真正的風格，不是被定義，而是回到自己。探索 HOVER 中性日常服飾，以舒適剪裁與簡約質感，陪你找到屬於自己的經典。",
  alternates: { canonical: "/brand" },
};

export default function BrandPage() {
  return <Client />;
}
