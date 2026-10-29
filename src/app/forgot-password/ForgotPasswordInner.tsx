// src/app/forgot-password/ForgotPasswordInner.tsx
"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ForgotPasswordInner() {
  const search = useSearchParams();
  const next = search.get("next") || "/account";

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setMsg("");
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, next }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.message || "發送重設密碼信件失敗，請稍後再試。");
      } else {
        setMsg(
          data.message ||
            "如果此 Email 有註冊，我們已發送重設密碼連結。請於 30 分鐘內前往信箱操作。",
        );
      }
    } catch {
      setError("系統錯誤，請稍後再試。");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md space-y-4 rounded-xl bg-white p-8 shadow-md">
        <h2 className="text-center text-2xl font-semibold text-black">
          忘記密碼
        </h2>
        <p className="text-center text-sm leading-relaxed text-[#666]">
          請輸入註冊時使用的電子郵件，我們會寄送重設密碼連結。請於 30
          分鐘內至信箱點擊連結完成設定。
        </p>

        {error ? (
          <p className="rounded-md border border-rose-200 bg-rose-50 py-2 text-center text-sm text-rose-600">
            {error}
          </p>
        ) : null}

        {msg ? (
          <div className="space-y-2 rounded-md border border-[#c5d4d1] bg-[#f3f6f5] px-3 py-3 text-center text-sm text-[#2a514d]">
            <p className="font-medium">{msg}</p>
            <p className="text-[12px] leading-relaxed text-[#2a514d]/90">
              若未收到信件，請檢查垃圾郵件匣，或稍後再試一次。
            </p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="你的電子郵件"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border p-2 outline-none focus:ring-2 focus:ring-[#2a514d]/30"
            required
          />
          <button
            type="submit"
            disabled={sending}
            className={`w-full rounded-md p-2 text-white transition ${
              sending
                ? "cursor-not-allowed bg-[#2a514d]/40"
                : "bg-[#2a514d] hover:bg-[#1e3d3a]"
            }`}
          >
            {sending ? "寄送中…" : "寄送重設密碼信件"}
          </button>
        </form>
      </div>
    </div>
  );
}
