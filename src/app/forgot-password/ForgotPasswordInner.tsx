// src/app/forgot-password/ForgotPasswordInner.tsx
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ForgotPasswordInner() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/account";

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [isSocial, setIsSocial] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setMsg("");
    setError("");
    setIsSocial(false);

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
        setIsSocial(Boolean(data.social));
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
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md space-y-4">
        <h2 className="text-2xl font-semibold text-center">忘記密碼</h2>
        <p className="text-sm text-slate-600 text-center">
          請輸入你註冊時使用的電子郵件，我們會寄送一封重設密碼的連結給你。
        </p>

        {error && (
          <p className="text-rose-600 text-sm text-center bg-rose-50 border border-rose-200 rounded-md py-2">
            {error}
          </p>
        )}
        {msg && (
          <div
            className={`text-sm text-center rounded-md py-3 px-3 border ${
              isSocial
                ? "text-[#2a514d] bg-[#f3f6f5] border-[#c5d4d1]"
                : "text-emerald-700 bg-emerald-50 border-emerald-200"
            }`}
          >
            <p>{msg}</p>
            {isSocial ? (
              <button
                type="button"
                onClick={() =>
                  router.push(`/login?next=${encodeURIComponent(next)}`)
                }
                className="mt-3 inline-block bg-[#2a514d] px-5 py-2 text-[13px] font-medium text-white hover:opacity-80"
              >
                前往社群登入
              </button>
            ) : null}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="email"
            placeholder="你的電子郵件"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-300"
            required
          />
          <button
            type="submit"
            disabled={sending}
            className={`w-full p-2 rounded-md text-white transition ${
              sending
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-slate-800 hover:bg-slate-700"
            }`}
          >
            {sending ? "寄送中…" : "寄送重設密碼信件"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500">
          想起密碼了？{" "}
          <button
            type="button"
            onClick={() =>
              router.push(`/login?next=${encodeURIComponent(next)}`)
            }
            className="text-slate-700 underline"
          >
            回到登入
          </button>
        </p>
      </div>
    </div>
  );
}
