import type { Metadata } from "next";
import { buildPrivatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPrivatePageMetadata({
  title: "忘記密碼｜HOVER",
  description: "重設 HOVER 會員密碼。",
});

export default function ForgotPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
