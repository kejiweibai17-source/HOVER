import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import {
  LINE_STATE_COOKIE,
  decodeLineState,
  getLineCallbackUrl,
  getLineChannelId,
  getLineChannelSecret,
  getSiteUrl,
  lineAuthCookieOpts,
  lineSyntheticEmail,
  redirectWithLineError,
  safeNextPath,
  sessionCookieOpts,
} from "@/lib/lineAuth";
import {
  applyExclusiveCustomSession,
  upsertSocialCustomer,
} from "@/lib/socialAccount";
import { grantWelcomeGiftIfEligible } from "@/lib/welcomeGift";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = process.env.WC_API_BASE || "";
const CK = process.env.WC_CONSUMER_KEY || "";
const CS = process.env.WC_CONSUMER_SECRET || "";
const JWT_SECRET =
  process.env.RESET_TOKEN_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.JWT_SECRET ||
  "";

type LineProfile = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
};

async function exchangeLineToken(code: string) {
  const channelId = getLineChannelId();
  const channelSecret = getLineChannelSecret();
  const callbackUrl = getLineCallbackUrl();

  const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: callbackUrl,
      client_id: channelId,
      client_secret: channelSecret,
    }),
    cache: "no-store",
  });

  const tokenData = await tokenRes.json().catch(() => ({}));
  if (!tokenRes.ok || !tokenData?.id_token) {
    console.error("[line/callback] token error:", tokenData);
    throw new Error("line_token_failed");
  }

  const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      id_token: String(tokenData.id_token),
      client_id: channelId,
    }),
    cache: "no-store",
  });

  const profile = (await verifyRes.json().catch(() => ({}))) as LineProfile & {
    error?: string;
  };

  if (!verifyRes.ok || !profile?.sub) {
    console.error("[line/callback] verify error:", profile);
    throw new Error("line_verify_failed");
  }

  return profile;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const stateParam = searchParams.get("state");

  const stateFromCookie = decodeLineState(
    cookies().get(LINE_STATE_COOKIE)?.value || null,
  );
  const stateFromQuery = decodeLineState(stateParam);
  const state = stateFromCookie || stateFromQuery;
  const nextPath = safeNextPath(state?.next);
  const from: "login" | "register" =
    state?.from === "register" ? "register" : "login";

  if (error || !code) {
    return redirectWithLineError(from, "line_login_failed", nextPath);
  }

  if (
    !stateFromCookie ||
    !stateFromQuery ||
    stateFromCookie.csrf !== stateFromQuery.csrf
  ) {
    console.error("[line/callback] state mismatch");
    return redirectWithLineError(from, "line_state_invalid", nextPath);
  }

  if (!getLineChannelId() || !getLineChannelSecret() || !getLineCallbackUrl()) {
    return redirectWithLineError(from, "line_config", nextPath);
  }

  if (!JWT_SECRET) {
    return redirectWithLineError(from, "line_config", nextPath);
  }

  if (!BASE || !CK || !CS) {
    return redirectWithLineError(from, "line_config", nextPath);
  }

  try {
    const profile = await exchangeLineToken(code);
    const lineUserId = String(profile.sub);
    const rawEmail = String(profile.email || "").trim().toLowerCase();

    const user = await upsertSocialCustomer({
      provider: "line",
      providerUserId: lineUserId,
      email: rawEmail,
      name: profile.name,
      picture: profile.picture,
      emailVerified: Boolean(profile.email_verified || rawEmail),
    });

    const email = String(
      user?.email || rawEmail || lineSyntheticEmail(lineUserId),
    )
      .trim()
      .toLowerCase();

    try {
      const customerId = Number(user?.id || 0);
      if (customerId && email) {
        await grantWelcomeGiftIfEligible(
          customerId,
          email,
          Array.isArray(user?.meta_data) ? user.meta_data : undefined,
        );
      }
    } catch (e) {
      console.error("grantWelcomeGift (line) error:", e);
    }

    const name =
      String(user?.first_name || profile.name || "").trim() ||
      email.split("@")[0] ||
      "HOVER 會員";

    if (!email) {
      return redirectWithLineError(from, "no_email_permission", nextPath);
    }

    const sessionToken = jwt.sign(
      {
        id: user.id,
        email,
        role: user.role || "customer",
        name,
        provider: "line",
        lineUserId,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    const site = getSiteUrl();
    const redirectTo = new URL(nextPath, site).toString();
    const response = NextResponse.redirect(redirectTo);
    const cookieOpts = sessionCookieOpts();

    applyExclusiveCustomSession(response, "line");
    response.cookies.set("auth_token", sessionToken, cookieOpts);
    response.cookies.set("user_email", email, cookieOpts);
    response.cookies.set("user_name", name, cookieOpts);
    response.cookies.set(LINE_STATE_COOKIE, "", {
      ...lineAuthCookieOpts(0),
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error("[line/callback]", err);
    return redirectWithLineError(from, "server_error", nextPath);
  }
}
