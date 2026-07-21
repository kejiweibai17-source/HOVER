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
  title: "隱私權政策｜HOVER",
  description:
    "查看 HOVER 隱私權政策，了解個人資料蒐集、使用方式及資訊安全保護。",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <Client />;
}
