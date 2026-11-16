import type { Metadata } from "next";
import { buildPrivatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPrivatePageMetadata({
  title: "管理後台｜HOVER",
  description: "HOVER 網站管理後台。",
});

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
