import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  GOOGLE_STATE_COOKIE,
  decodeGoogleState,
  getGoogleBindCallbackUrl,
  getGoogleClientId,
  getGoogleClientSecret,
  getSiteUrl,
  googleAuthCookieOpts,
  redirectWithGoogleError,
  safeNextPath,
  withBoundSuccessPath,
} from "@/lib/googleAuth";
import {
  bindSocialToLoggedInCustomer,
  resolveSessionCustomerId,
  resolveSocialAccount,
} from "@/lib/socialLink";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type GoogleProfile = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  email_verified?: boolean;
};

async function exchangeGoogleToken(code: string): Promise<GoogleProfile> {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const callbackUrl = getGoogleBindCallbackUrl();

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: callbackUrl,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  const tokenData = (await tokenRes.json().catch(() => ({}))) as {
    access_token?: string;
    id_token?: string;
    error?: string;
  };

  if (!tokenRes.ok || !tokenData?.access_token) {
    console.error("[google/callback] token error:", tokenData);
    throw new Error("google_token_failed");
  }

  const profileRes = await fetch(
    "https://openidconnect.googleapis.com/v1/userinfo",
    {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
      cache: "no-store",
    },
  );
  const profile = (await profileRes.json().catch(() => ({}))) as GoogleProfile & {
    error?: string;
  };

  if (!profileRes.ok || !profile?.sub) {
    console.error("[google/callback] userinfo error:", profile);
    throw new Error("google_profile_failed");
  }

  return {
    sub: String(profile.sub),
    email: profile.email
      ? String(profile.email).trim().toLowerCase()
      : undefined,
    name: profile.name ? String(profile.name).trim() : undefined,
    picture: profile.picture ? String(profile.picture) : undefined,
    email_verified: Boolean(profile.email_verified ?? true),
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const stateParam = searchParams.get("state");

  const stateFromCookie = decodeGoogleState(
    cookies().get(GOOGLE_STATE_COOKIE)?.value || null,
  );
  const stateFromQuery = decodeGoogleState(stateParam);
  const state = stateFromCookie || stateFromQuery;
  const nextPath = safeNextPath(state?.next);
  const from =
    state?.from === "register"
      ? "register"
      : state?.from === "account"
        ? "account"
        : "login";

  const clearStateCookie = (res: NextResponse) => {
    res.cookies.set(GOOGLE_STATE_COOKIE, "", {
      ...googleAuthCookieOpts(0),
      maxAge: 0,
    });
    return res;
  };

  if (error || !code) {
    return clearStateCookie(
      redirectWithGoogleError(from, "google_login_failed", nextPath),
    );
  }

  if (
    !stateFromCookie ||
    !stateFromQuery ||
    stateFromCookie.csrf !== stateFromQuery.csrf
  ) {
    console.error("[google/callback] state mismatch");
    return clearStateCookie(
      redirectWithGoogleError(from, "google_state_invalid", nextPath),
    );
  }

  if (
    !getGoogleClientId() ||
    !getGoogleClientSecret() ||
    !getGoogleBindCallbackUrl()
  ) {
    return clearStateCookie(
      redirectWithGoogleError(from, "google_config", nextPath),
    );
  }

  // 此 callback 僅處理會員中心綁定；登入仍走 NextAuth
  if (from !== "account") {
    return clearStateCookie(
      redirectWithGoogleError("login", "google_login_failed", nextPath),
    );
  }

  try {
    const profile = await exchangeGoogleToken(code);
    const googleUserId = String(profile.sub);
    const rawEmail = String(profile.email || "").trim().toLowerCase();

    const customerId = await resolveSessionCustomerId();
    if (!customerId) {
      return clearStateCookie(
        redirectWithGoogleError("account", "bind_login_required", nextPath),
      );
    }

    const resolved = await resolveSocialAccount({
      provider: "google",
      providerUserId: googleUserId,
      email: rawEmail,
    });

    const site = getSiteUrl();

    if (resolved.status === "existing") {
      const existingId = Number(resolved.customer?.id || 0);
      if (existingId === customerId) {
        const response = NextResponse.redirect(
          new URL(withBoundSuccessPath(nextPath || "/account"), site).toString(),
        );
        return clearStateCookie(response);
      }
      return clearStateCookie(
        redirectWithGoogleError("account", "social_taken", nextPath),
      );
    }

    const bound = await bindSocialToLoggedInCustomer({
      customerId,
      provider: "google",
      providerUserId: googleUserId,
      name: profile.name,
      picture: profile.picture,
      emailVerified: Boolean(profile.email_verified || rawEmail),
    });

    if (!bound.ok) {
      return clearStateCookie(
        redirectWithGoogleError("account", bound.code, nextPath),
      );
    }

    const response = NextResponse.redirect(
      new URL(withBoundSuccessPath(nextPath || "/account"), site).toString(),
    );
    return clearStateCookie(response);
  } catch (err) {
    console.error("[google/callback]", err);
    return clearStateCookie(
      redirectWithGoogleError("account", "google_server_error", nextPath),
    );
  }
}
