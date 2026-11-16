// app/verify-email/page.tsx
import { Suspense } from "react";
import type { Metadata } from "next";
import VerifyEmailInner from "./VerifyEmailInner";
import { buildPrivatePageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = buildPrivatePageMetadata({
  title: "驗證 Email｜HOVER",
  description: "驗證 HOVER 會員 Email。",
});

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white px-4">
          <div className="bg-white p-6 rounded-xl shadow-md w-full max-w-md text-center text-slate-600">
            驗證中…
          </div>
        </div>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
