// src/app/forgot-password/page.tsx
"use client";

import { Suspense } from "react";
import ForgotPasswordInner from "./ForgotPasswordInner";

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          載入中...
        </div>
      }
    >
      <ForgotPasswordInner />
    </Suspense>
  );
}
