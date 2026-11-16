import { Metadata } from "next";
import HowToBuyClient from "./client";
import { fetchPolicyPage } from "@/lib/fetchPolicyPage";
import { buildPublicPageMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = buildPublicPageMetadata({
  title: "如何購買｜HOVER",
  description:
    "了解 HOVER 如何購買，包含付款方式、配送說明、出貨時間及訂單相關資訊。",
  path: "/how-to-buy",
  keywords: ["HOVER", "如何購買", "付款", "配送"],
});

export default async function HowToBuyPage() {
  const { data } = await fetchPolicyPage("how-to-buy");
  return <HowToBuyClient initial={data} />;
}
