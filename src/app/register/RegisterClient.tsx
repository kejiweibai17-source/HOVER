"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { AuthField } from "@/components/hover/AuthField";
import { TurnstileWidget } from "@/components/hover/TurnstileWidget";

export const dynamic = "force-dynamic";

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

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [birthday, setBirthday] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ref) setRefCookie(ref);
  }, [ref]);

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (loading) return;
    setError("");

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("請填寫姓名");
      return;
    }

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
          name: trimmedName,
          password,
          birthday: birthday || undefined,
          phone,
          ref,
          turnstileToken,
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

      <div className="flex w-full items-center justify-center bg-hover-bg px-8 py-16 lg:w-1/2 lg:px-16 xl:px-24">
        <div className="w-full max-w-[380px]">
          <div className="mb-10 flex gap-8 border-b border-[#ccc] pb-0">
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
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

          {error && (
            <p className="mb-5 text-[13px] text-[#c90000]">{error}</p>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <AuthField
              label="姓名"
              type="text"
              name="name"
              value={name}
              onChange={setName}
              disabled={loading}
              required
              autoComplete="name"
            />
            <AuthField
              label="手機號碼"
              type="tel"
              name="phone"
              value={phone}
              onChange={setPhone}
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
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
              disabled={loading}
              required
              autoComplete="new-password"
              minLength={8}
            />
            <div>
              <AuthField
                label="西元生日"
                type="date"
                name="birthday"
                value={birthday}
                onChange={setBirthday}
                disabled={loading}
                autoComplete="bday"
              />
              <p className="mt-1.5 text-[12px] leading-[1.6] text-[#888]">
                選填。可之後至會員中心補填；設定完成後不可自行修改。
              </p>
            </div>

            <TurnstileWidget
              onToken={setTurnstileToken}
              onExpire={() => setTurnstileToken("")}
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
              disabled={loading}
              className="mt-2 w-full bg-[#2a514d] py-3.5 text-[14px] font-semibold tracking-[0.08em] text-white transition-colors hover:bg-[#1e3d3a] disabled:opacity-60"
            >
              {loading ? "註冊中..." : "註冊"}
            </button>
          </form>

          <p className="mt-8 text-center text-[13px] text-[#666]">
            已有帳號？{" "}
            <Link
              href={`/login?next=${encodeURIComponent(next)}`}
              className="font-semibold text-[#2a514d] underline underline-offset-2"
            >
              前往登入
            </Link>
            （含 Google／LINE／Facebook）
          </p>
        </div>
      </div>
    </div>
  );
}
