import { Metadata } from "next";
import TermsClient from "./client";
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
  title: "服務條款｜HOVER",
  description: "查看 HOVER 網站服務條款與網站使用規範。",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

export default async function TermsPage() {
  const { data } = await fetchPolicyPage("terms");
  return <TermsClient initial={data} />;
}
