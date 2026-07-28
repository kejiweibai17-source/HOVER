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
  title: "服務條款｜HOVER",
  description: "查看 HOVER 網站服務條款與網站使用規範。",
  alternates: { canonical: "/terms" },
  // Facebook App 審核需要可讀取；其餘頁面仍維持 noindex
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return <Client />;
}
