"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { AuthField, AuthAccountField } from "@/components/hover/AuthField";
import { TurnstileWidget } from "@/components/hover/TurnstileWidget";
import { oauthSignIn } from "@/lib/oauthSignIn";

export const dynamic = "force-dynamic";

function getCallbackUrl(nextPath: string) {
  const path = nextPath || "/account";
  if (typeof window === "undefined") return path;
  return /^https?:\/\//i.test(path)
    ? path
    : `${window.location.origin}${path.startsWith("/") ? path : `/${path}`}`;
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  Configuration:
    "登入設定不完整，請確認 .env.local 的 NEXTAUTH_SECRET、GOOGLE_CLIENT_ID 等變數。",
  AccessDenied: "您已取消授權或無權限登入。",
  Verification: "驗證連結無效或已過期。",
  OAuthSignin: "無法連線 Google，請確認 OAuth 用戶端 ID 與重新導向 URI。",
  OAuthCallback: "Google 回傳失敗，請確認 Callback URL 是否為 http://localhost:3000/api/auth/callback/google",
  OAuthCreateAccount: "無法建立帳號，請稍後再試。",
  Callback: "登入回呼失敗，請稍後再試。",
  undefined:
    "無法連線登入服務。請清除 localhost:3000 的 Cookie 與 Service Worker 後重試。",
  google: "正在準備 Google 登入，若未跳轉請再按一次。",
  line_config:
    "LINE 登入設定不完整，請確認 .env.local 的 LINE_CHANNEL_ID、LINE_CHANNEL_SECRET、LINE_CALLBACK_URL。",
  line_login_failed: "您已取消 LINE 授權，或授權失敗，請再試一次。",
  line_state_invalid: "LINE 登入驗證失效，請重新點擊 LINE 登入。",
  facebook_config:
    "Facebook 登入設定不完整，請確認 FACEBOOK_CLIENT_ID、FACEBOOK_CLIENT_SECRET、FACEBOOK_CALLBACK_URL。",
  facebook_login_failed: "您已取消 Facebook 授權，或授權失敗，請再試一次。",
  facebook_state_invalid: "Facebook 登入驗證失效，請重新點擊 Facebook 登入。",
  facebook_server_error: "Facebook 登入處理失敗，請稍後再試。",
  no_email_permission:
    "無法取得社群帳號信箱。請確認授權 email 權限後再試。",
  server_error: "LINE 登入處理失敗，請稍後再試。",
  Default: "第三方登入失敗，請稍後再試。",
};

export default function LoginClient() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/account";
  const authError = search.get("error");

  const [username, setUsername] = useState("");
  const [verifyEmail, setVerifyEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (authError && authError !== "google") {
      setError(AUTH_ERROR_MESSAGES[authError] || AUTH_ERROR_MESSAGES.Default);
    }
  }, [authError]);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [fbLoading, setFbLoading] = useState(false);
  const [lineLoading, setLineLoading] = useState(false);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

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
    if (loading || googleLoading || fbLoading || lineLoading) return;
    setError("");
    setSuccess("");
    setNeedsVerify(false);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password, turnstileToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSuccess("登入成功，正在跳轉...");
        setTimeout(() => router.replace(next), 500);
      } else {
        const code = String(data?.code || "");
        if (code === "email_not_verified") {
          setNeedsVerify(true);
          setVerifyEmail(String(data?.email || "").trim());
          setError(
            data?.message ||
              "此帳號尚未完成信箱驗證，請先至信箱點擊驗證連結後再登入。",
          );
        } else {
          setNeedsVerify(false);
          setVerifyEmail("");
          setError(
            String(data?.message || "")
              .replace(/<[^>]*>/g, "")
              .trim() || "登入失敗，請確認手機號碼與密碼。",
          );
        }
      }
    } catch {
      setError("登入過程發生錯誤，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendVerification() {
    const target = (verifyEmail || username).trim();
    if (resendLoading || !target) return;
    setResendLoading(true);
    setSuccess("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          verifyEmail
            ? { email: verifyEmail }
            : { phone: username.trim() },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setError(data.message || "重新寄送失敗，請稍後再試。");
      } else {
        setError("");
        setSuccess(data.message || "驗證信已寄出，請至信箱查收。");
      }
    } catch {
      setError("重新寄送失敗，請稍後再試。");
    } finally {
      setResendLoading(false);
    }
  }

  async function handleGoogle() {
    if (loading || googleLoading || fbLoading || lineLoading) return;
    setError("");
    setGoogleLoading(true);
    try {
      await oauthSignIn("google", getCallbackUrl(next));
    } catch (e) {
      setError(e instanceof Error ? e.message : AUTH_ERROR_MESSAGES.Default);
      setGoogleLoading(false);
    }
  }

  function handleFacebook() {
    if (loading || googleLoading || fbLoading || lineLoading) return;
    setFbLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        next,
        from: "login",
      });
      window.location.href = `/api/auth/facebook/start?${params.toString()}`;
    } catch (e) {
      console.error(e);
      setError(AUTH_ERROR_MESSAGES.Default);
      setFbLoading(false);
    }
  }

  function handleLineLogin() {
    if (loading || googleLoading || fbLoading || lineLoading) return;
    setLineLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        next,
        from: "login",
      });
      window.location.href = `/api/auth/line/start?${params.toString()}`;
    } catch (e) {
      console.error(e);
      setError(AUTH_ERROR_MESSAGES.Default);
      setLineLoading(false);
    }
  }

  const isAnyLoading = loading || googleLoading || fbLoading || lineLoading;

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
            <div className="mb-5 space-y-2">
              <p className="text-[13px] text-[#c90000]">{error}</p>
              {needsVerify ? (
                <button
                  type="button"
                  onClick={handleResendVerification}
                  disabled={resendLoading || !(verifyEmail || username).trim()}
                  className="text-[13px] font-medium text-[#2a514d] underline underline-offset-2 hover:opacity-70 disabled:opacity-50"
                >
                  {resendLoading ? "寄送中…" : "重新寄送驗證信"}
                </button>
              ) : null}
            </div>
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
              <TurnstileWidget
                className="mt-4"
                onToken={setTurnstileToken}
                onExpire={() => setTurnstileToken("")}
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
            <p className="mb-1 text-[13px] text-[#555]">社群登入</p>
            <p className="mb-4 text-[12px] leading-[1.6] text-[#888]">
              已註冊會員可綁定後使用。尚未加入請先至「加入會員」完成基本註冊。
            </p>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={isAnyLoading}
                className="flex w-full items-center justify-center gap-2 border border-[#ddd] bg-white py-2.5 text-[13px] font-semibold text-[#333] transition-opacity hover:opacity-85 disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Google 登入</span>
              </button>

              <button
                type="button"
                onClick={handleLineLogin}
                disabled={isAnyLoading}
                className="flex w-full items-center justify-center gap-2 bg-[#06C755] py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden>
                  <path d="M12 2C6.48 2 2 5.5 2 9.812c0 2.775 1.96 5.226 4.945 6.7-.27 1.013-.81 2.826-.855 3.051 0 0-.045.274.09.462.135.187.45.15.45.15 3-1.387 4.665-3.637 4.665-3.637.24.025.465.049.705.049 5.52 0 10-3.5 10-7.812C22 5.5 17.52 2 12 2z" />
                </svg>
                <span>LINE 登入</span>
              </button>

              <button
                type="button"
                onClick={handleFacebook}
                disabled={isAnyLoading}
                className="flex w-full items-center justify-center gap-2 bg-[#1877F2] py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85 disabled:opacity-50"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden>
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                <span>Facebook 登入</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
