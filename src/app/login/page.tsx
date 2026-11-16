import { Suspense } from "react";
import type { Metadata } from "next";
import LoginClient from "./LoginClient";
import { buildPrivatePageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = buildPrivatePageMetadata({
  title: "會員登入｜HOVER",
  description: "登入 HOVER 會員帳號，查看訂單、收藏與會員專屬服務。",
});

export default function Page() {
  return (
    <Suspense
      fallback={<div className="p-6 text-center text-slate-500">載入中…</div>}
    >
      <LoginClient />
    </Suspense>
  );
}
