import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import {
  applyExclusiveCustomSession,
  applyExclusiveEmailSession,
} from "@/lib/socialAccount";
import {
  bindSocialToCustomer,
  clearSocialPendingCookie,
  findCustomerByPhone,
  isValidTwMobile,
  normalizeTwPhone,
  SOCIAL_PENDING_COOKIE,
  verifySocialPending,
} from "@/lib/socialLink";
import {
  authRateLimitCookieOptions,
  checkAuthRateLimit,
  clearAuthRateLimitCookie,
  clientIp,
  recordAuthFailure,
} from "@/lib/authRateLimit";
import { verifyTurnstileToken } from "@/lib/turnstile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = process.env.WC_API_BASE || "";
const JWT_SECRET =
  process.env.RESET_TOKEN_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.JWT_SECRET ||
  "secret";

const isProd = process.env.NODE_ENV === "production";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    domain: COOKIE_DOMAIN,
    maxAge: 7 * 24 * 60 * 60,
  };
}

async function authenticateWithWordPress(username: string, password: string) {
  const hoverRes = await fetch(`${BASE}/wp-json/hover/v1/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });
  const hoverData = await hoverRes.json().catch(() => ({}));
  if (hoverRes.ok && (hoverData?.ok || hoverData?.user_email)) {
    return {
      ok: true as const,
      email: String(hoverData.user_email || "").trim().toLowerCase(),
      userId: Number(hoverData.user_id || 0) || undefined,
    };
  }

  const hoverMissing =
    hoverRes.status === 404 ||
    String(hoverData?.code || "").includes("rest_no_route");

  if (!hoverMissing && !hoverRes.ok) {
    return { ok: false as const };
  }

  const wpRes = await fetch(`${BASE}/wp-json/jwt-auth/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });
  const data = await wpRes.json().catch(() => ({}));
  if (wpRes.ok && data?.token) {
    return {
      ok: true as const,
      email: String(data.user_email || "").trim().toLowerCase(),
      userId: undefined,
    };
  }
  return { ok: false as const };
}

export async function POST(req: Request) {
  try {
    const pendingToken = cookies().get(SOCIAL_PENDING_COOKIE)?.value || "";
    const pending = pendingToken ? verifySocialPending(pendingToken) : null;
    if (!pending) {
      return NextResponse.json(
        { ok: false, message: "社群登入已過期，請重新使用第三方登入" },
        { status: 401 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const phone = normalizeTwPhone(String(body.phone || ""));
    const password = String(body.password || "");
    const turnstileToken = String(body.turnstileToken || "").trim();

    if (!isValidTwMobile(phone) || !password) {
      return NextResponse.json(
        { ok: false, message: "請輸入註冊時的手機號碼與密碼" },
        { status: 400 },
      );
    }

    const rate = checkAuthRateLimit({
      req,
      action: "social_bind",
      identifier: phone,
    });
    if (!rate.ok) {
      return NextResponse.json(
        {
          ok: false,
          message: rate.message,
          code: "rate_limited",
          retryAfterSec: rate.retryAfterSec,
        },
        {
          status: 429,
          headers: { "Retry-After": String(rate.retryAfterSec) },
        },
      );
    }

    const captcha = await verifyTurnstileToken(turnstileToken, clientIp(req));
    if (!captcha.ok) {
      return NextResponse.json(
        { ok: false, message: captcha.message, code: "captcha_failed" },
        { status: 400 },
      );
    }

    const customer = await findCustomerByPhone(phone);
    if (!customer?.id) {
      const fail = recordAuthFailure({
        req,
        action: "social_bind",
        identifier: phone,
      });
      const out = NextResponse.json(
        {
          ok: false,
          message: "找不到此手機對應的會員，請確認是否已基本註冊",
        },
        { status: 404 },
      );
      if (fail.cookieValue) {
        out.cookies.set(
          "hover_auth_rl",
          fail.cookieValue,
          authRateLimitCookieOptions(),
        );
      }
      return out;
    }

    const customerEmail = String(customer.email || "").trim().toLowerCase();
    const loginId = customerEmail || phone;
    const auth = await authenticateWithWordPress(loginId, password);
    if (!auth.ok) {
      // 再試一次用手機當 username（舊資料可能用手機當帳號）
      const authPhone = await authenticateWithWordPress(phone, password);
      if (!authPhone.ok) {
        const fail = recordAuthFailure({
          req,
          action: "social_bind",
          identifier: phone,
        });
        const out = NextResponse.json(
          {
            ok: false,
            message: fail.locked
              ? `嘗試次數過多，請 ${Math.ceil(fail.retryAfterSec / 60)} 分鐘後再試`
              : "手機號碼或密碼錯誤",
            code: fail.locked ? "rate_limited" : "invalid_login",
          },
          { status: fail.locked ? 429 : 401 },
        );
        if (fail.cookieValue) {
          out.cookies.set(
            "hover_auth_rl",
            fail.cookieValue,
            authRateLimitCookieOptions(),
          );
        }
        return out;
      }
    }

    const customerId = Number(customer.id);
    const updated = await bindSocialToCustomer({
      customerId,
      provider: pending.provider,
      providerUserId: pending.providerUserId,
      name: pending.name,
      picture: pending.picture,
      emailVerified: pending.emailVerified,
    });

    const email =
      String(updated?.email || customerEmail || auth.email || "").trim().toLowerCase();
    const name =
      String(updated?.first_name || pending.name || "").trim() ||
      email.split("@")[0] ||
      "HOVER 會員";

    const sessionToken = jwt.sign(
      {
        id: customerId,
        email,
        role: updated?.role || customer.role || "customer",
        name,
        provider: pending.provider,
        providerUserId: pending.providerUserId,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    const next = String(pending.next || "/account");
    const res = NextResponse.json({
      ok: true,
      next: next.startsWith("/") ? next : "/account",
      message: "已綁定既有會員帳號",
    });

    if (pending.provider === "google") {
      applyExclusiveEmailSession(res);
    } else {
      applyExclusiveCustomSession(res, pending.provider);
    }
    res.cookies.set("auth_token", sessionToken, cookieOpts());
    res.cookies.set("user_email", email, cookieOpts());
    res.cookies.set("user_name", name, cookieOpts());
    clearSocialPendingCookie(res);
    const clearRl = clearAuthRateLimitCookie();
    res.cookies.set(clearRl.name, clearRl.value, clearRl.options);
    return res;
  } catch (e) {
    console.error("[social/bind]", e);
    return NextResponse.json(
      { ok: false, message: "綁定失敗，請稍後再試" },
      { status: 500 },
    );
  }
}
