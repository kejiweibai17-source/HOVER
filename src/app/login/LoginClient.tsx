"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { AuthField, AuthAccountField } from "@/components/hover/AuthField";

export const dynamic = "force-dynamic";

function getCallbackUrl(nextPath: string) {
  const path = nextPath || "/account";
  if (typeof window === "undefined") return path;
  return /^https?:\/\//i.test(path)
    ? path
    : `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

export default function LoginClient() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/account";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loading, setLoading] = useState(false);
  const [fbLoading, setFbLoading] = useState(false);
  const [lineLoading, setLineLoading] = useState(false);

  /* auto-redirect if already logged in */
  useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const r = await fetch("/api/account/profile", {
          cache: "no-store",
          credentials: "include",
        });
        const js = await r.json();
        if (!abort && js?.loggedIn) router.replace(next);
      } catch {}
    })();
    return () => { abort = true; };
  }, [router, next]);

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || fbLoading || lineLoading) return;
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccess("登入成功，正在跳轉...");
        setTimeout(() => router.replace(next), 500);
      } else {
        setError(data?.message || "登入失敗，請確認帳號與密碼。");
      }
    } catch {
      setError("登入過程發生錯誤，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }

  async function handleFacebook() {
    if (loading || fbLoading || lineLoading) return;
    setError("");
    setFbLoading(true);
    try {
      await signIn("facebook", { callbackUrl: getCallbackUrl(next) });
    } finally {
      setTimeout(() => setFbLoading(false), 1200);
    }
  }

  function handleLineLogin() {
    if (loading || fbLoading || lineLoading) return;
    setLineLoading(true);
    setError("");
    try {
      const clientId = process.env.NEXT_PUBLIC_LINE_CHANNEL_ID;
      if (!clientId) {
        setError("系統設定錯誤：缺少 LINE Channel ID");
        setLineLoading(false);
        return;
      }
      const redirectUri = window.location.origin + "/api/auth/line/callback";
      window.location.href = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=random_state_string&scope=profile openid email`;
    } catch (e) {
      console.error(e);
      setLineLoading(false);
    }
  }

  const isAnyLoading = loading || fbLoading || lineLoading;

  return (
    <div className="flex min-h-[calc(100vh-var(--hover-header-height,116px))]">
      {/* Left — hero photo */}
      <div className="relative hidden w-1/2 lg:block">
        <Image
          src="/images/hover/people-1.jpg"
          alt="HOVER"
          fill
          className="object-cover object-center"
          priority
          sizes="50vw"
        />
      </div>

      {/* Right — form */}
      <div className="flex w-full items-center justify-center bg-hover-bg px-8 py-16 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="w-full max-w-[380px]">

          {/* Tabs */}
          <div className="mb-10 flex gap-8 border-b border-[#ccc] pb-0">
            <button
              type="button"
              className="pb-3 text-[15px] font-bold text-black border-b-2 border-black -mb-px"
            >
              登入會員
            </button>
            <Link
              href="/register"
              className="pb-3 text-[15px] text-[#aaa] hover:text-black transition-colors -mb-px border-b-2 border-transparent"
            >
              加入會員
            </Link>
          </div>

          {/* Error / Success */}
          {error && (
            <p className="mb-5 text-[13px] text-[#c90000]">{error}</p>
          )}
          {success && (
            <p className="mb-5 text-[13px] text-[#2a514d]">{success}</p>
          )}

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-6">
            <AuthAccountField
              value={username}
              onChange={setUsername}
              disabled={isAnyLoading}
              required
            />
            <div>
              <AuthField
                label="密碼"
                type="password"
                value={password}
                onChange={setPassword}
                disabled={isAnyLoading}
                required
                autoComplete="current-password"
                name="password"
              />
              <div className="mt-1 text-right">
                <Link
                  href="/forgot-password"
                  className="text-[12px] text-[#c90000] hover:opacity-70"
                >
                  忘記密碼？
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={isAnyLoading}
              className="mt-2 w-full bg-[#2a514d] py-3.5 text-[14px] font-semibold tracking-[0.08em] text-white transition-colors hover:bg-[#1e3d3a] disabled:opacity-60"
            >
              {loading ? "登入中..." : "登入"}
            </button>
          </form>

          {/* Social login */}
          <div className="mt-8">
            <p className="mb-4 text-[13px] text-[#555]">快速登入</p>
            <div className="flex gap-3">
              {/* LINE */}
              <button
                type="button"
                onClick={handleLineLogin}
                disabled={isAnyLoading}
                className="flex flex-1 items-center justify-center gap-2 bg-[#06C755] py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white">
                  <path d="M12 2C6.48 2 2 5.5 2 9.812c0 2.775 1.96 5.226 4.945 6.7-.27 1.013-.81 2.826-.855 3.051 0 0-.045.274.09.462.135.187.45.15.45.15 3-1.387 4.665-3.637 4.665-3.637.24.025.465.049.705.049 5.52 0 10-3.5 10-7.812C22 5.5 17.52 2 12 2z" />
                </svg>
                <span>LINE 登入</span>
              </button>

              {/* Facebook */}
              <button
                type="button"
                onClick={handleFacebook}
                disabled={isAnyLoading}
                className="flex flex-1 items-center justify-center gap-2 bg-[#1877F2] py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>FACEBOOK 登入</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
