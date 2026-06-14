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
  title: "隱私權保護｜HOVER 威爾特",
  description:
    "了解 HOVER 如何蒐集、使用與保護您的個人資料，包含會員資料、訂單資訊及第三方登入相關說明。",
  alternates: { canonical: "/privacy" },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: "/privacy",
    siteName: "HOVER 威爾特",
    title: "隱私權保護｜HOVER 威爾特",
    description:
      "了解 HOVER 如何蒐集、使用與保護您的個人資料，包含會員資料、訂單資訊及第三方登入相關說明。",
  },
};

export default function PrivacyPage() {
  return <Client />;
}
