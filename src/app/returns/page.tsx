import { Metadata } from "next";
import ReturnsClient from "./client";
import { fetchPolicyPage } from "@/lib/fetchPolicyPage";
import { buildPublicPageMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = buildPublicPageMetadata({
  title: "申請退貨｜HOVER",
  description:
    "了解 HOVER 退貨流程、退貨申請方式、退款說明及相關注意事項。",
  path: "/returns",
  keywords: ["HOVER", "退貨", "退款"],
});

export default async function ReturnsPage() {
  const { data } = await fetchPolicyPage("returns");
  return <ReturnsClient initial={data} />;
}
