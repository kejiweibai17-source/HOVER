import { Metadata } from "next";
import HowToBuyClient from "./client";

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
  title: "如何購買｜HOVER 威爾特",
  description:
    "了解 HOVER 官方網站購物流程、付款方式、配送說明、出貨時間與防詐騙提醒。",
  alternates: { canonical: "/how-to-buy" },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: "/how-to-buy",
    siteName: "HOVER 威爾特",
    title: "如何購買｜HOVER 威爾特",
    description:
      "HOVER 購物流程、付款與配送方式完整說明。",
  },
};

export default function HowToBuyPage() {
  return <HowToBuyClient />;
}
