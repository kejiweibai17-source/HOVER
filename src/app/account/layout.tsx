import type { Metadata } from "next";
import { buildPrivatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPrivatePageMetadata({
  title: "會員中心｜HOVER",
  description: "管理 HOVER 會員資料、訂單與收藏。",
});

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
