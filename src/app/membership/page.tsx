import { Metadata } from "next";
import MembershipClient from "./client";
import { buildPublicPageMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = buildPublicPageMetadata({
  title: "會員制度｜HOVER",
  description:
    "加入 HOVER 會員，享有入會禮、生日禮、會員優惠與消費累積升等，了解完整會員權益與專屬福利。",
  path: "/membership",
  keywords: ["HOVER", "會員制度", "會員優惠", "購物金"],
});

export default function MembershipPage() {
  return <MembershipClient />;
}
