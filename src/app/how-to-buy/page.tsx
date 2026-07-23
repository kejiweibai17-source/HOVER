import { Metadata } from "next";
import HowToBuyClient from "./client";
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
  title: "如何購買｜HOVER",
  description:
    "了解 HOVER 如何購買，包含付款方式、配送說明、出貨時間及訂單相關資訊。",
  alternates: { canonical: "/how-to-buy" },
};

export default async function HowToBuyPage() {
  const { data } = await fetchPolicyPage("how-to-buy");
  return <HowToBuyClient initial={data} />;
}
