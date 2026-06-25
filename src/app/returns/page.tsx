import { Metadata } from "next";
import ReturnsClient from "./client";

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
  title: "申請退貨｜HOVER 威爾特",
  description:
    "了解 HOVER 退貨須知、申請流程、超商退貨說明、退款方式與時間，安心完成退貨申請。",
  alternates: { canonical: "/returns" },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: "/returns",
    siteName: "HOVER 威爾特",
    title: "申請退貨｜HOVER 威爾特",
    description:
      "HOVER 退貨申請流程、退款說明與注意事項完整指南。",
  },
};

export default function ReturnsPage() {
  return <ReturnsClient />;
}
