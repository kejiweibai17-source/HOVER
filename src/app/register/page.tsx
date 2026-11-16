import { Suspense } from "react";
import type { Metadata } from "next";
import RegisterClient from "./RegisterClient";
import { buildPrivatePageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = buildPrivatePageMetadata({
  title: "註冊會員｜HOVER",
  description: "註冊 HOVER 會員，享受入會禮與會員專屬優惠。",
});

export default function Page() {
  return (
    <Suspense
      fallback={<div className="p-6 text-center text-slate-500">載入中…</div>}
    >
      <RegisterClient />
    </Suspense>
  );
}
