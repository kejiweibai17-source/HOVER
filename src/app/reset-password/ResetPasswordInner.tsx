// src/app/reset-password/ResetPasswordInner.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function ResetPasswordInner() {
  const router = useRouter();
  const search = useSearchParams();
  const token = search.get("token") || "";
  const next = search.get("next") || "/account";

  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) {
      setError("重設連結無效或已過期。");
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    if (!token) {
      setError("重設連結無效或已過期。");
      return;
    }
    if (password.length < 6) {
      setError("新密碼長度至少 6 碼。");
      return;
    }
    if (password !== password2) {
      setError("兩次輸入的密碼不一致。");
      return;
    }

    setSubmitting(true);
    setMsg("");
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        setError(data.message || "重設密碼失敗，請稍後再試。");
      } else {
        setMsg("密碼已重設成功，你可以使用新密碼登入。");
        setTimeout(() => {
          router.replace(`/login?next=${encodeURIComponent(next)}`);
        }, 1500);
      }
    } catch {
      setError("系統錯誤，請稍後再試。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md space-y-4">
        <h2 className="text-2xl font-semibold text-center">重設密碼</h2>

        {!token && (
          <p className="text-sm text-slate-600 text-center">
            重設連結無效或已過期，請重新申請「忘記密碼」。
          </p>
        )}

        {error && (
          <p className="text-rose-600 text-sm text-center bg-rose-50 border border-rose-200 rounded-md py-2">
            {error}
          </p>
        )}
        {msg && (
          <p className="text-emerald-700 text-sm text-center bg-emerald-50 border border-emerald-200 rounded-md py-2">
            {msg}
          </p>
        )}

        {token && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="password"
              placeholder="新密碼（至少 6 碼）"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-300"
              required
            />
            <input
              type="password"
              placeholder="再次輸入新密碼"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              className="w-full border p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-300"
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className={`w-full p-2 rounded-md text-white transition ${
                submitting
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-slate-800 hover:bg-slate-700"
              }`}
            >
              {submitting ? "送出中…" : "確認重設密碼"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-slate-500">
          <button
            type="button"
            onClick={() =>
              router.push(`/login?next=${encodeURIComponent(next)}`)
            }
            className="text-slate-700 underline"
          >
            返回登入
          </button>
        </p>
      </div>
    </div>
  );
}
