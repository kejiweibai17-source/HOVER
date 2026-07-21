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
  title: "會員制度｜HOVER",
  description:
    "加入 HOVER 會員，享有入會禮、生日禮、會員優惠與消費累積升等，了解完整會員權益與專屬福利。",
  alternates: { canonical: "/membership" },
};

export default function MembershipPage() {
  return <MembershipClient />;
}
