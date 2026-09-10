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
              註冊會員
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

          {/* Social login — 圖四樣式：直向邊框按鈕 */}
          <div className="mt-8">
            <p className="mb-4 text-[14px] font-medium text-black">快速登入</p>
            <div className="flex flex-col gap-3">
              {[
                {
                  key: "google",
                  onClick: handleGoogle,
                  src: "/images/social/google.png",
                  label: "GOOGLE 登入",
                },
                {
                  key: "line",
                  onClick: handleLineLogin,
                  src: "/images/social/line.jpg",
                  label: "LINE 登入",
                },
                {
                  key: "facebook",
                  onClick: handleFacebook,
                  src: "/images/social/facebook.jpg",
                  label: "FACEBOOK 登入",
                },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={item.onClick}
                  disabled={isAnyLoading}
                  className="flex h-[48px] w-full items-center justify-center border border-[#333] bg-white text-[13px] font-semibold tracking-[0.06em] text-black transition-colors hover:bg-[#f7f7f7] disabled:opacity-50"
                >
                  <span className="grid w-[168px] grid-cols-[22px_1fr] items-center gap-x-3">
                    <Image
                      src={item.src}
                      alt=""
                      width={22}
                      height={22}
                      className="h-[22px] w-[22px] object-contain"
                    />
                    <span className="text-left">{item.label}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
