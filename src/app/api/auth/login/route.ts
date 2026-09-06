// app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { applyExclusiveEmailSession } from "@/lib/socialAccount";
import {
  authRateLimitCookieOptions,
  checkAuthRateLimit,
  clearAuthRateLimitCookie,
  clientIp,
  recordAuthFailure,
} from "@/lib/authRateLimit";
import { verifyTurnstileToken } from "@/lib/turnstile";

const BASE = process.env.WC_API_BASE;
const CK = process.env.WC_CONSUMER_KEY;
const CS = process.env.WC_CONSUMER_SECRET;
const JWT_SECRET =
  process.env.RESET_TOKEN_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.JWT_SECRET ||
  "secret";

const isProd = process.env.NODE_ENV === "production";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const JWT_MAX_AGE_SECONDS = process.env.JWT_MAX_AGE_SECONDS
  ? Number(process.env.JWT_MAX_AGE_SECONDS)
  : 7 * 24 * 60 * 60;

const UNVERIFIED_MESSAGE =
  "此帳號尚未完成信箱驗證，請先至信箱點擊驗證連結後再登入。";

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    domain: COOKIE_DOMAIN,
    ...(JWT_MAX_AGE_SECONDS ? { maxAge: JWT_MAX_AGE_SECONDS } : {}),
  };
}

function basicAuth() {
  if (!CK || !CS) return undefined;
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

function stripHtml(input: unknown) {
  return String(input || "")
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isUnverifiedCustomer(customer: any) {
  const meta: any[] = Array.isArray(customer?.meta_data)
    ? customer.meta_data
    : [];
  const verifyMeta = meta.find((m) => m?.key === "email_verified");
  return Boolean(verifyMeta && String(verifyMeta.value) === "0");
}

async function findCustomerByLogin(login: string) {
  const authHeader = basicAuth();
  if (!authHeader || !BASE) return null;

  const raw = String(login || "").trim();
  if (!raw) return null;

  const { normalizeTwPhone, isValidTwMobile, findCustomerByPhone } =
    await import("@/lib/socialLink");
  const phone = normalizeTwPhone(raw);
  if (isValidTwMobile(phone)) {
    const byPhone = await findCustomerByPhone(phone);
    if (byPhone) return byPhone;
  }

  const emailLike = raw.includes("@") ? raw.toLowerCase() : "";
  if (emailLike) {
    const custRes = await fetch(
      `${BASE}/wp-json/wc/v3/customers?email=${encodeURIComponent(emailLike)}&role=all`,
      {
        headers: { Authorization: authHeader },
        cache: "no-store",
      },
    );
    if (custRes.ok) {
      const arr = (await custRes.json().catch(() => [])) as any[];
      if (Array.isArray(arr) && arr.length > 0) return arr[0];
    }
  }
  return null;
}

function friendlyAuthError(status: number, data: any) {
  const raw = stripHtml(data?.message || data?.code || "");
  const code = String(data?.code || "").toLowerCase();

  if (
    code.includes("rest_no_route") ||
    raw.includes("找不到與網址") ||
    raw.includes("No route was found")
  ) {
    return "登入服務尚未啟用，請確認 WordPress 已啟用 HOVER Email 登入 Snippet。";
  }

  if (
    status === 403 ||
    status === 401 ||
    code.includes("invalid_login") ||
    raw.includes("帳號或密碼錯誤")
  ) {
    return "帳號或密碼錯誤";
  }

  return raw || `登入失敗（${status}）`;
}

/** 優先使用自訂 hover/v1/login；若無則嘗試 jwt-auth 外掛 */
async function authenticateWithWordPress(username: string, password: string) {
  // 1) HOVER snippet
  const hoverRes = await fetch(`${BASE}/wp-json/hover/v1/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });
  const hoverText = await hoverRes.text();
  let hoverData: any = {};
  try {
    hoverData = JSON.parse(hoverText);
  } catch {
    hoverData = {};
  }

  if (hoverRes.ok && (hoverData?.ok || hoverData?.user_email)) {
    return {
      ok: true as const,
      source: "hover" as const,
      email: String(hoverData.user_email || "").trim(),
      name: String(
        hoverData.user_display_name ||
          hoverData.user_nicename ||
          hoverData.user_email ||
          "",
      ).trim(),
      userId: Number(hoverData.user_id || 0) || undefined,
      role: String(hoverData.role || "customer"),
      wpJwt: null as string | null,
    };
  }

  // hover 端點不存在 → 再試 jwt-auth
  const hoverMissing =
    hoverRes.status === 404 ||
    String(hoverData?.code || "").includes("rest_no_route");

  if (!hoverMissing && !hoverRes.ok) {
    return {
      ok: false as const,
      status: hoverRes.status || 401,
      data: hoverData,
    };
  }

  // 2) JWT Auth plugin fallback
  const wpRes = await fetch(`${BASE}/wp-json/jwt-auth/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
    cache: "no-store",
  });
  const text = await wpRes.text();
  let data: any = {};
  try {
    data = JSON.parse(text);
  } catch {
    data = {};
  }

  if (wpRes.ok && data?.token) {
    return {
      ok: true as const,
      source: "jwt-auth" as const,
      email: String(data.user_email || "").trim(),
      name: String(
        data.user_display_name || data.user_nicename || data.user_email || "",
      ).trim(),
      userId: undefined,
      role: "customer",
      wpJwt: String(data.token),
    };
  }

  return {
    ok: false as const,
    status: hoverMissing ? wpRes.status || 401 : hoverRes.status || 401,
    data: hoverMissing ? data : hoverData,
  };
}

export async function POST(req: Request) {
  try {
    if (!BASE) {
      return NextResponse.json(
        { message: "環境變數 WC_API_BASE 未設定" },
        { status: 500 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const usernameRaw: string = String(
      body?.username || body?.phone || "",
    ).trim();
    const password: string = String(body?.password || "").trim();
    const turnstileToken = String(body?.turnstileToken || "").trim();

    if (!usernameRaw || !password) {
      return NextResponse.json(
        { message: "請輸入手機號碼與密碼" },
        { status: 400 },
      );
    }

    const rate = checkAuthRateLimit({
      req,
      action: "login",
      identifier: usernameRaw,
    });
    if (!rate.ok) {
      return NextResponse.json(
        {
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
        { message: captcha.message, code: "captcha_failed" },
        { status: 400 },
      );
    }

    // 先查會員（手機為主；亦相容舊的 email 登入）
    let customer: any = null;
    try {
      customer = await findCustomerByLogin(usernameRaw);
    } catch (e) {
      console.error("findCustomerByLogin error:", e);
    }

    // WP 帳號多半是 email：手機登入時改用會員 email 驗證密碼
    const authLogin =
      String(customer?.email || "").trim().toLowerCase() || usernameRaw;

    let auth = await authenticateWithWordPress(authLogin, password);
    if (!auth.ok && authLogin !== usernameRaw) {
      auth = await authenticateWithWordPress(usernameRaw, password);
    }
    const unverified = isUnverifiedCustomer(customer);

    if (!auth.ok) {
      const fail = recordAuthFailure({
        req,
        action: "login",
        identifier: usernameRaw,
      });
      if (unverified) {
        const res = NextResponse.json(
          {
            message: UNVERIFIED_MESSAGE,
            code: "email_not_verified",
            email:
              String(customer?.email || "").trim().toLowerCase() || undefined,
          },
          { status: 403 },
        );
        if (fail.cookieValue) {
          res.cookies.set(
            "hover_auth_rl",
            fail.cookieValue,
            authRateLimitCookieOptions(),
          );
        }
        return res;
      }

      const res = NextResponse.json(
        {
          message: fail.locked
            ? `嘗試次數過多，請 ${Math.ceil(fail.retryAfterSec / 60)} 分鐘後再試`
            : friendlyAuthError(auth.status, auth.data),
          code: fail.locked ? "rate_limited" : auth.data?.code || String(auth.status),
          retryAfterSec: fail.locked ? fail.retryAfterSec : undefined,
        },
        { status: fail.locked ? 429 : auth.status || 401 },
      );
      if (fail.cookieValue) {
        res.cookies.set(
          "hover_auth_rl",
          fail.cookieValue,
          authRateLimitCookieOptions(),
        );
      }
      return res;
    }

    const email = String(auth.email || customer?.email || "").trim();
    const name = String(
      auth.name ||
        customer?.first_name ||
        email.split("@")[0] ||
        "HOVER 會員",
    ).trim();

    // 擋未驗證帳號
    if (unverified) {
      return NextResponse.json(
        {
          message: UNVERIFIED_MESSAGE,
          code: "email_not_verified",
          email: email || undefined,
        },
        { status: 403 },
      );
    }

    if (!customer && email) {
      try {
        customer = await findCustomerByLogin(email);
        if (isUnverifiedCustomer(customer)) {
          return NextResponse.json(
            {
              message: UNVERIFIED_MESSAGE,
              code: "email_not_verified",
              email,
            },
            { status: 403 },
          );
        }
      } catch (e) {
        console.error("check email_verified error:", e);
      }
    }

    const customerId = Number(customer?.id || auth.userId || 0) || undefined;

    // 簽發與社群登入相同的 auth_token（不依賴 WP JWT 外掛）
    const sessionToken = jwt.sign(
      {
        id: customerId,
        email,
        role: auth.role || customer?.role || "customer",
        name,
        provider: "email",
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    const res = NextResponse.json(
      {
        ok: true,
        user: { email, name },
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    );

    res.cookies.set("auth_token", sessionToken, cookieOpts());
    if (auth.wpJwt) {
      res.cookies.set("jwt", auth.wpJwt, cookieOpts());
    }
    if (email) {
      res.cookies.set("user_email", email, cookieOpts());
    }
    res.cookies.set("user_name", name, cookieOpts());
    applyExclusiveEmailSession(res);
    const clearRl = clearAuthRateLimitCookie();
    res.cookies.set(clearRl.name, clearRl.value, clearRl.options);

    return res;
  } catch (err: any) {
    console.error("login error:", err);
    return NextResponse.json(
      { message: err?.message || "登入例外錯誤" },
      { status: 500 },
    );
  }
}
