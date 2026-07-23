import { Metadata } from "next";
import ReturnsClient from "./client";
import { fetchPolicyPage } from "@/lib/fetchPolicyPage";

export const dynamic = "force-dynamic";

const getSiteUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_URL)
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return "http://localhost:3000";
};

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "申請退貨｜HOVER",
  description:
    "了解 HOVER 退貨流程、退貨申請方式、退款說明及相關注意事項。",
  alternates: { canonical: "/returns" },
};

export default async function ReturnsPage() {
  const { data } = await fetchPolicyPage("returns");
  return <ReturnsClient initial={data} />;
}
