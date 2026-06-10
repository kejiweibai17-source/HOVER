// src/app/reset-password/page.tsx
import { Suspense } from "react";
import ResetPasswordInner from "./ResetPasswordInner";

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
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
