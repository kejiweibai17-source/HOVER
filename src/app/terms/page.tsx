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
  title: "服務條款｜HOVER 威爾特",
  description:
    "HOVER 官方網站服務條款，說明會員權益、訂購流程、付款配送、退換貨及相關使用規範。",
  alternates: { canonical: "/terms" },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: "/terms",
    siteName: "HOVER 威爾特",
    title: "服務條款｜HOVER 威爾特",
    description:
      "HOVER 官方網站服務條款，說明會員權益、訂購流程、付款配送、退換貨及相關使用規範。",
  },
};

export default function TermsPage() {
  return <Client />;
}
