// app/verify-email/page.tsx
import { Suspense } from "react";
import VerifyEmailInner from "./VerifyEmailInner";

export const dynamic = "force-dynamic";

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
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
