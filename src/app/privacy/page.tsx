import { Metadata } from "next";
import PrivacyClient from "./client";
import { fetchPolicyPage } from "@/lib/fetchPolicyPage";
import { buildPublicPageMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = buildPublicPageMetadata({
  title: "隱私權政策｜HOVER",
  description:
    "查看 HOVER 隱私權政策，了解個人資料蒐集、使用方式及資訊安全保護。",
  path: "/privacy",
  keywords: ["HOVER", "隱私權政策", "個資"],
});

export default async function PrivacyPage() {
  const { data } = await fetchPolicyPage("privacy");
  return <PrivacyClient initial={data} />;
}
