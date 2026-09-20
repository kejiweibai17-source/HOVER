"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Link } from "next-view-transitions";
import { AuthField } from "@/components/hover/AuthField";
import { TurnstileWidget } from "@/components/hover/TurnstileWidget";

type SocialProvider = "google" | "line" | "facebook";

const PROVIDER_ICON: Record<SocialProvider, { src: string; alt: string }> = {
  google: { src: "/images/social/google.png", alt: "Google" },
  line: { src: "/images/social/line.jpg", alt: "LINE" },
  facebook: { src: "/images/social/facebook.jpg", alt: "Facebook" },
};

function normalizeProvider(value: unknown): SocialProvider | null {
  const p = String(value || "").toLowerCase();
  if (p === "google" || p === "line" || p === "facebook") return p;
  return null;
}

const PROVIDER_LABEL: Record<SocialProvider, string> = {
  google: "Google",
  line: "LINE",
  facebook: "Facebook",
};

function LinkAccountContent() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/account";
  const registerHref = `/register?next=${encodeURIComponent(next)}`;
  const demoProvider = normalizeProvider(search.get("demo"));
  const isDemo = Boolean(demoProvider);

  const [provider, setProvider] = useState<SocialProvider | null>(demoProvider);
  const [providerLabel, setProviderLabel] = useState(
    demoProvider ? PROVIDER_LABEL[demoProvider] : "第三方",
  );
  const [ready, setReady] = useState(isDemo);
  const [missing, setMissing] = useState(false);

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [bindLoading, setBindLoading] = useState(false);

  useEffect(() => {
    if (isDemo && demoProvider) {
      setProvider(demoProvider);
      setProviderLabel(PROVIDER_LABEL[demoProvider]);
      setMissing(false);
      setReady(true);
      return;
    }

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
        const normalized = normalizeProvider(data.provider);
        setProvider(normalized);
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
  }, [demoProvider, isDemo]);

  async function handleBind(e: React.FormEvent) {
    e.preventDefault();
    if (bindLoading) return;
    if (isDemo) {
      setError("這是預覽頁，不會真的綁定。請改用實際社群登入流程。");
      return;
    }
    setError("");
    setBindLoading(true);
    try {
      const res = await fetch("/api/auth/social/bind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, password, turnstileToken }),
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

  const icon = provider ? PROVIDER_ICON[provider] : null;

  return (
    <div className="mx-auto max-w-md px-6 py-12 md:py-16">
      <p className="text-center text-[13px] font-semibold tracking-[0.18em] text-[#2a514d]">
        HOVER
      </p>
      <h1 className="mt-2 text-center text-[22px] font-bold text-black">
        第三方帳號綁定
      </h1>

      {isDemo ? (
        <div className="mt-4 flex justify-center gap-3 text-[12px] text-[#888]">
          {(["google", "line", "facebook"] as SocialProvider[]).map((p) => (
            <Link
              key={p}
              href={`/auth/link-account?demo=${p}`}
              className={
                provider === p
                  ? "font-semibold text-[#2a514d] underline underline-offset-2"
                  : "underline underline-offset-2 hover:text-black"
              }
            >
              {PROVIDER_LABEL[p]}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="mt-10 text-center">
        {icon ? (
          <Image
            src={icon.src}
            alt={icon.alt}
            width={48}
            height={48}
            className="mx-auto h-12 w-12 object-contain"
            priority
          />
        ) : null}
        <h2 className="mt-5 text-[18px] font-bold text-black">
          綁定 {providerLabel}
        </h2>
        <p className="mt-3 text-[13px] leading-relaxed text-[#666]">
          首次使用 {providerLabel} 登入，請先驗證您的 HOVER 會員帳號。
        </p>
      </div>

      {error ? (
        <p className="mt-6 text-center text-[13px] text-[#c90000]">{error}</p>
      ) : null}

      <section className="mt-8 border-t border-[#ddd] pt-6">
        <h3 className="text-center text-[15px] font-semibold text-[#2a514d]">
          驗證 HOVER 會員帳號
        </h3>
        <form onSubmit={handleBind} className="mt-5 space-y-4">
          <AuthField
            label="註冊手機號碼"
            type="tel"
            name="phone"
            value={phone}
            onChange={setPhone}
            required
            autoComplete="tel"
            inputMode="tel"
            pattern="09[0-9]{8}"
            maxLength={10}
            disabled={bindLoading}
          />
          <AuthField
            label="密碼"
            type="password"
            name="password"
            value={password}
            onChange={setPassword}
            required
            autoComplete="current-password"
            disabled={bindLoading}
          />
          <TurnstileWidget
            onToken={setTurnstileToken}
            onExpire={() => setTurnstileToken("")}
          />
          <button
            type="submit"
            disabled={bindLoading}
            className="w-full bg-[#2a514d] py-3.5 text-[14px] font-semibold tracking-[0.06em] text-white disabled:opacity-60"
          >
            {bindLoading ? "驗證中…" : "驗證並綁定"}
          </button>
        </form>
      </section>

      <section className="mt-8 border-t border-[#ddd] pt-6 text-center">
        <h3 className="text-[15px] font-semibold text-[#2a514d]">
          尚未加入 HOVER ?
        </h3>
        <p className="mt-2 text-[12px] leading-relaxed text-[#888]">
          請先完成會員註冊，再回來綁定 {providerLabel}。
        </p>
        <Link
          href={registerHref}
          className="mt-5 inline-flex w-full items-center justify-center border border-[#2a514d] py-3.5 text-[14px] font-semibold tracking-[0.06em] text-[#2a514d]"
        >
          前往註冊會員
        </Link>
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
