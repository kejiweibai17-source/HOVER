import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  GOOGLE_STATE_COOKIE,
  encodeGoogleState,
  getGoogleBindCallbackUrl,
  getGoogleClientId,
  googleAuthCookieOpts,
  redirectWithGoogleError,
  safeNextPath,
} from "@/lib/googleAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Google OAuth start — 目前供會員中心「已登入直接綁定」使用（from=account）。
 * 登入頁 Google 仍走 NextAuth `/api/auth/signin/google`。
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNextPath(url.searchParams.get("next"));
  const ref = String(url.searchParams.get("ref") || "").trim();
  const fromRaw = String(url.searchParams.get("from") || "").toLowerCase();
  const from =
    fromRaw === "register"
      ? "register"
      : fromRaw === "account"
        ? "account"
        : "login";

  // 非會員中心綁定：請走登入頁 NextAuth，避免雙路徑衝突
  if (from !== "account") {
    const site = (
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000"
    ).replace(/\/$/, "");
    const login = new URL(`${site}/login`);
    login.searchParams.set("next", next);
    return NextResponse.redirect(login.toString());
  }

  const clientId = getGoogleClientId();
  const callbackUrl = getGoogleBindCallbackUrl();

  if (!clientId || !callbackUrl) {
    console.error(
      "[google/start] missing GOOGLE_CLIENT_ID or bind callback URL",
    );
    return redirectWithGoogleError(from, "google_config", next);
  }

  const state = encodeGoogleState({
    csrf: randomUUID(),
    next,
    ref,
    from,
  });

  const authorize = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", callbackUrl);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "openid email profile");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("prompt", "select_account");
  authorize.searchParams.set("access_type", "online");

  const res = NextResponse.redirect(authorize.toString());
  res.cookies.set(GOOGLE_STATE_COOKIE, state, googleAuthCookieOpts(60 * 10));

  return res;
}
