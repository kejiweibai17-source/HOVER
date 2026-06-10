"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function VerifyEmailInner() {
  const search = useSearchParams();
  const router = useRouter();
  const token = search.get("token") || "";

  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMsg("驗證連結有誤，缺少 token。");
      return;
    }

    let abort = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();

        if (abort) return;

        if (res.ok && data?.ok) {
          setStatus("ok");
          setMsg(data.message || "信箱驗證完成，您現在可以登入了。");
        } else {
          setStatus("error");
          setMsg(data?.message || "驗證失敗，請稍後再試。");
        }
      } catch {
        if (!abort) {
          setStatus("error");
          setMsg("驗證過程發生錯誤，請稍後再試。");
        }
      }
    })();

    return () => {
      abort = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md space-y-4 text-center">
        <h2 className="text-2xl font-semibold">信箱驗證</h2>

        {status === "loading" && (
          <p className="text-slate-600">驗證中，請稍候…</p>
        )}

        {status !== "loading" && (
          <p
            className={`text-sm ${
              status === "ok" ? "text-emerald-700" : "text-rose-600"
            }`}
          >
            {msg}
          </p>
        )}

        {status === "ok" && (
          <button
            onClick={() => router.push("/login")}
            className="mt-2 w-full rounded-md bg-slate-800 px-4 py-2 text-white hover:bg-slate-700"
          >
            前往登入
          </button>
        )}
      </div>
    </div>
  );
}
