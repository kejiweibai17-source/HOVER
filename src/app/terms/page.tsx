import { Metadata } from "next";
import TermsClient from "./client";
import { fetchPolicyPage } from "@/lib/fetchPolicyPage";
import { buildPublicPageMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = buildPublicPageMetadata({
  title: "服務條款｜HOVER",
  description: "查看 HOVER 網站服務條款與網站使用規範。",
  path: "/terms",
  keywords: ["HOVER", "服務條款"],
});

export default async function TermsPage() {
  const { data } = await fetchPolicyPage("terms");
  return <TermsClient initial={data} />;
}
