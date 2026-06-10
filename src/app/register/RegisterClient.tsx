"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { AuthField } from "@/components/hover/AuthField";

export const dynamic = "force-dynamic";

function getCallbackUrl(nextPath: string) {
  const path = nextPath || "/account";
  if (typeof window === "undefined") return path;
  return /^https?:\/\//i.test(path)
    ? path
    : `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

function setRefCookie(ref: string) {
  if (typeof window === "undefined") return;
  const v = (ref || "").trim();
  if (!v) return;
  const isHttps = window.location.protocol === "https:";
  document.cookie = `uf_ref=${encodeURIComponent(v)}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax${isHttps ? "; Secure" : ""}`;
}

export default function RegisterPage() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/account";
  const ref = search.get("ref") || "";

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [birthday, setBirthday] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [loading, setLoading] = useState(false);
  const [fbLoading, setFbLoading] = useState(false);
  const [lineLoading, setLineLoading] = useState(false);

  useEffect(() => {
    if (ref) setRefCookie(ref);
  }, [ref]);

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading || fbLoading || lineLoading) return;
    setError("");

    if (password !== confirmPassword) {
      setError("密碼與確認密碼不一致");
      return;
    }

    setLoading(true);
    try {
      if (ref) setRefCookie(ref);
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          username: username || phone,
          password,
          birthday,
          ref,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data?.message || "註冊失敗");
      }
    } catch {
      setError("註冊過程發生錯誤，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }

  async function handleFacebook() {
    if (loading || fbLoading || lineLoading) return;
    setError("");
    setFbLoading(true);
    try {
      if (ref) setRefCookie(ref);
      const cb = getCallbackUrl(next);
      const cbUrl = new URL(cb);
      if (ref) cbUrl.searchParams.set("ref", ref);
      await signIn("facebook", { callbackUrl: cbUrl.toString() });
    } finally {
      setTimeout(() => setFbLoading(false), 1200);
    }
  }

  function handleLineLogin() {
    if (loading || fbLoading || lineLoading) return;
    setLineLoading(true);
    setError("");
    try {
      if (ref) setRefCookie(ref);
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

  /* Success screen */
  if (success) {
    return (
      <div className="flex min-h-[calc(100vh-var(--hover-header-height,116px))] items-center justify-center bg-hover-bg px-8">
        <div className="w-full max-w-[380px] text-center">
          <h2 className="mb-4 text-[22px] font-bold text-black">🎉 註冊成功！</h2>
          <p className="mb-8 text-[14px] leading-[1.8] text-[#555]">
            我們已寄出一封{" "}
            <span className="font-semibold text-black">信箱驗證信</span> 到：
            <br />
            <span className="font-medium text-[#2a514d]">{email}</span>
            <br />
            請至信箱點擊驗證連結，完成後即可登入。
          </p>
          <button
            onClick={() => router.push(`/login?next=${encodeURIComponent(next)}`)}
            className="w-full bg-[#2a514d] py-3.5 text-[14px] font-semibold tracking-[0.08em] text-white hover:bg-[#1e3d3a]"
          >
            前往登入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-var(--hover-header-height,116px))]">
      {/* Left — hero photo */}
      <div className="relative hidden w-1/2 lg:block">
        <Image
          src="/images/hover/people-2.jpg"
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
            <Link
              href="/login"
              className="pb-3 text-[15px] text-[#aaa] hover:text-black transition-colors -mb-px border-b-2 border-transparent"
            >
              登入會員
            </Link>
            <button
              type="button"
              className="pb-3 text-[15px] font-bold text-black border-b-2 border-black -mb-px"
            >
              加入會員
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="mb-5 text-[13px] text-[#c90000]">{error}</p>
          )}

          {/* Register form */}
          <form onSubmit={handleRegister} className="space-y-5">
            <AuthField
              label="手機號碼"
              type="tel"
              name="phone"
              value={phone}
              onChange={setPhone}
              disabled={isAnyLoading}
              required
              autoComplete="tel"
              inputMode="tel"
              pattern="09[0-9]{8}"
              maxLength={10}
            />
            <AuthField
              label="電子信箱"
              type="email"
              name="email"
              value={email}
              onChange={setEmail}
              disabled={isAnyLoading}
              required
              autoComplete="email"
              inputMode="email"
            />
            <AuthField
              label="密碼"
              type="password"
              name="password"
              value={password}
              onChange={setPassword}
              disabled={isAnyLoading}
              required
              autoComplete="new-password"
              minLength={8}
            />
            <AuthField
              label="確認密碼"
              type="password"
              name="confirmPassword"
              value={confirmPassword}
              onChange={setConfirmPassword}
              disabled={isAnyLoading}
              required
              autoComplete="new-password"
              minLength={8}
            />
            <AuthField
              label="西元生日"
              type="date"
              name="birthday"
              value={birthday}
              onChange={setBirthday}
              disabled={isAnyLoading}
              required
              autoComplete="bday"
            />

            <p className="text-[12px] leading-[1.7] text-[#c90000]">
              註冊完成時，您代表您同意使用者{" "}
              <Link href="/terms" className="underline hover:opacity-70">
                條款
              </Link>
              {" "}與{" "}
              <Link href="/privacy" className="underline hover:opacity-70">
                隱私政策
              </Link>
              。
            </p>

            <button
              type="submit"
              disabled={isAnyLoading}
              className="mt-2 w-full bg-[#2a514d] py-3.5 text-[14px] font-semibold tracking-[0.08em] text-white transition-colors hover:bg-[#1e3d3a] disabled:opacity-60"
            >
              {loading ? "註冊中..." : "註冊"}
            </button>
          </form>

          {/* Social login */}
          <div className="mt-8">
            <p className="mb-4 text-[13px] text-[#555]">快速註冊</p>
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
