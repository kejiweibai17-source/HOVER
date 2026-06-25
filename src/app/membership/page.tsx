import { Metadata } from "next";
import MembershipClient from "./client";

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
  title: "會員制度｜HOVER 威爾特",
  description:
    "了解 HOVER 會員制度：品牌好友與臻享會員權益、購物金使用說明與升級條件。",
  alternates: { canonical: "/membership" },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: "/membership",
    siteName: "HOVER 威爾特",
    title: "會員制度｜HOVER 威爾特",
    description:
      "HOVER FRIENDS 品牌好友與 HOVER EXCLUSIVE 臻享會員完整權益說明。",
  },
};

export default function MembershipPage() {
  return <MembershipClient />;
}
