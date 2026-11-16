// src/app/reset-password/page.tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import ResetPasswordInner from "./ResetPasswordInner";
import { buildPrivatePageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPrivatePageMetadata({
  title: "重設密碼｜HOVER",
  description: "重設 HOVER 會員密碼。",
});

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
          <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md text-center text-slate-600">
            載入中…
          </div>
        </div>
      }
    >
      <ResetPasswordInner />
    </Suspense>
  );
}
