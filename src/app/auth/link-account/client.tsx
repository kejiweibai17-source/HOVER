"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Link } from "next-view-transitions";
import { AuthField } from "@/components/hover/AuthField";

function LinkAccountContent() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/account";

  const [providerLabel, setProviderLabel] = useState("第三方");
  const [ready, setReady] = useState(false);
  const [missing, setMissing] = useState(false);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [bindLoading, setBindLoading] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/social/pending", {
          cache: "no-store",
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !data?.pending) {
          setMissing(true);
          setReady(true);
          return;
        }
        setProviderLabel(String(data.providerLabel || "第三方"));
        setReady(true);
      } catch {
        if (!cancelled) {
          setMissing(true);
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleBind(e: React.FormEvent) {
    e.preventDefault();
    if (bindLoading || createLoading) return;
    setError("");
    setBindLoading(true);
    try {
      const res = await fetch("/api/auth/social/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setError(String(data?.message || "綁定失敗"));
        return;
      }
      router.replace(String(data.next || next || "/account"));
    } catch {
      setError("綁定失敗，請稍後再試");
    } finally {
      setBindLoading(false);
    }
  }

  async function handleCreate() {
    if (bindLoading || createLoading) return;
    setError("");
    setCreateLoading(true);
    try {
      const res = await fetch("/api/auth/social/create", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.ok) {
        setError(String(data?.message || "建立會員失敗"));
        return;
      }
      router.replace(String(data.next || next || "/account"));
    } catch {
      setError("建立會員失敗，請稍後再試");
    } finally {
      setCreateLoading(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#dfe0e5] border-t-[#2a514d]" />
      </div>
    );
  }

  if (missing) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-[22px] font-bold text-black">社群登入已過期</h1>
        <p className="mt-4 text-[14px] leading-relaxed text-[#666]">
          請回到登入頁，重新使用 Google／LINE／Facebook 登入。
        </p>
        <Link
          href="/login"
          className="mt-8 inline-block bg-[#2a514d] px-8 py-3 text-[14px] font-semibold tracking-[0.06em] text-white"
        >
          回到登入
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12 md:py-16">
      <h1 className="text-center text-[22px] font-bold text-black">
        完成 {providerLabel} 登入
      </h1>
      <p className="mt-3 text-center text-[13px] leading-relaxed text-[#666]">
        若您已用手機註冊過會員，請驗證後綁定原帳號。
        <br />
        若是第一次加入，可直接建立新會員（手機之後結帳再填）。
      </p>

      {error ? (
        <p className="mt-6 text-center text-[13px] text-[#c90000]">{error}</p>
      ) : null}

      <section className="mt-8 border border-[#ddd] bg-white px-5 py-6">
        <h2 className="text-[15px] font-semibold text-black">
          已有會員？綁定既有帳號
        </h2>
        <form onSubmit={handleBind} className="mt-5 space-y-4">
          <AuthField
            label="註冊時的手機號碼"
            type="tel"
            name="phone"
            value={phone}
            onChange={setPhone}
            required
            autoComplete="tel"
            inputMode="tel"
            pattern="09[0-9]{8}"
            maxLength={10}
            disabled={bindLoading || createLoading}
          />
          <AuthField
            label="密碼"
            type="password"
            name="password"
            value={password}
            onChange={setPassword}
            required
            autoComplete="current-password"
            disabled={bindLoading || createLoading}
          />
          <button
            type="submit"
            disabled={bindLoading || createLoading}
            className="w-full bg-[#2a514d] py-3.5 text-[14px] font-semibold tracking-[0.06em] text-white disabled:opacity-60"
          >
            {bindLoading ? "驗證中…" : "驗證並綁定"}
          </button>
        </form>
      </section>

      <div className="my-8 flex items-center gap-3 text-[12px] text-[#999]">
        <span className="h-px flex-1 bg-[#ddd]" />
        或
        <span className="h-px flex-1 bg-[#ddd]" />
      </div>

      <section className="border border-[#ddd] bg-white px-5 py-6 text-center">
        <h2 className="text-[15px] font-semibold text-black">
          第一次使用？建立新會員
        </h2>
        <p className="mt-2 text-[12px] leading-relaxed text-[#888]">
          不需現在填手機，結帳時再補即可。
        </p>
        <button
          type="button"
          onClick={handleCreate}
          disabled={bindLoading || createLoading}
          className="mt-5 w-full border border-[#2a514d] py-3.5 text-[14px] font-semibold tracking-[0.06em] text-[#2a514d] disabled:opacity-60"
        >
          {createLoading ? "建立中…" : "建立新會員並繼續"}
        </button>
      </section>

      <p className="mt-8 text-center text-[12px] text-[#888]">
        <Link href="/login" className="underline underline-offset-2">
          取消，回到登入
        </Link>
      </p>
    </div>
  );
}

export default function LinkAccountClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[55vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#dfe0e5] border-t-[#2a514d]" />
        </div>
      }
    >
      <LinkAccountContent />
    </Suspense>
  );
}
