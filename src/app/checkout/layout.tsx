import type { Metadata } from "next";
import { buildPrivatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPrivatePageMetadata({
  title: "結帳｜HOVER",
  description: "完成 HOVER 訂單結帳。",
});

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
