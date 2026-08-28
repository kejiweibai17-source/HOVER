import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import {
  FACEBOOK_STATE_COOKIE,
  decodeFacebookState,
  facebookAuthCookieOpts,
  facebookSyntheticEmail,
  getFacebookCallbackUrl,
  getFacebookClientId,
  getFacebookClientSecret,
  getSiteUrl,
  redirectWithFacebookError,
  safeNextPath,
  sessionCookieOpts,
} from "@/lib/facebookAuth";
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

type FacebookProfile = {
  id: string;
  email?: string;
  name?: string;
  pictureUrl?: string;
};

async function exchangeFacebookToken(code: string): Promise<FacebookProfile> {
  const clientId = getFacebookClientId();
  const clientSecret = getFacebookClientSecret();
  const callbackUrl = getFacebookCallbackUrl();

  const tokenUrl = new URL(
    "https://graph.facebook.com/v21.0/oauth/access_token",
  );
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);
  tokenUrl.searchParams.set("redirect_uri", callbackUrl);
  tokenUrl.searchParams.set("code", code);

  const tokenRes = await fetch(tokenUrl.toString(), { cache: "no-store" });
  const tokenData = (await tokenRes.json().catch(() => ({}))) as {
    access_token?: string;
  };

  if (!tokenRes.ok || !tokenData?.access_token) {
    console.error("[facebook/callback] token error:", tokenData);
    throw new Error("facebook_token_failed");
  }

  const profileUrl = new URL("https://graph.facebook.com/v21.0/me");
  profileUrl.searchParams.set("fields", "id,name,email,picture.type(large)");
  profileUrl.searchParams.set("access_token", tokenData.access_token);

  const profileRes = await fetch(profileUrl.toString(), { cache: "no-store" });
  const profile = (await profileRes.json().catch(() => ({}))) as {
    id?: string;
    name?: string;
    email?: string;
    picture?: { data?: { url?: string } };
  };

  if (!profileRes.ok || !profile?.id) {
    console.error("[facebook/callback] profile error:", profile);
    throw new Error("facebook_profile_failed");
  }

  return {
    id: String(profile.id),
    email: profile.email
      ? String(profile.email).trim().toLowerCase()
      : undefined,
    name: profile.name ? String(profile.name).trim() : undefined,
    pictureUrl: profile.picture?.data?.url
      ? String(profile.picture.data.url)
      : undefined,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const stateParam = searchParams.get("state");

  const stateFromCookie = decodeFacebookState(
    cookies().get(FACEBOOK_STATE_COOKIE)?.value || null,
  );
  const stateFromQuery = decodeFacebookState(stateParam);
  const state = stateFromCookie || stateFromQuery;
  const nextPath = safeNextPath(state?.next);
  const from: "login" | "register" =
    state?.from === "register" ? "register" : "login";

  if (error || !code) {
    return redirectWithFacebookError(from, "facebook_login_failed", nextPath);
  }

  if (
    !stateFromCookie ||
    !stateFromQuery ||
    stateFromCookie.csrf !== stateFromQuery.csrf
  ) {
    console.error("[facebook/callback] state mismatch");
    return redirectWithFacebookError(from, "facebook_state_invalid", nextPath);
  }

  if (
    !getFacebookClientId() ||
    !getFacebookClientSecret() ||
    !getFacebookCallbackUrl()
  ) {
    return redirectWithFacebookError(from, "facebook_config", nextPath);
  }

  if (!JWT_SECRET || !BASE || !CK || !CS) {
    return redirectWithFacebookError(from, "facebook_config", nextPath);
  }

  try {
    const profile = await exchangeFacebookToken(code);
    const facebookUserId = String(profile.id);
    const rawEmail = String(profile.email || "").trim().toLowerCase();

    const user = await upsertSocialCustomer({
      provider: "facebook",
      providerUserId: facebookUserId,
      email: rawEmail,
      name: profile.name,
      picture: profile.pictureUrl,
      emailVerified: Boolean(rawEmail),
    });

    const email = String(
      user?.email || rawEmail || facebookSyntheticEmail(facebookUserId),
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
      console.error("grantWelcomeGift (facebook) error:", e);
    }

    const name =
      String(user?.first_name || profile.name || "").trim() ||
      email.split("@")[0] ||
      "HOVER 會員";

    if (!email) {
      return redirectWithFacebookError(from, "no_email_permission", nextPath);
    }

    const sessionToken = jwt.sign(
      {
        id: user.id,
        email,
        role: user.role || "customer",
        name,
        provider: "facebook",
        facebookUserId,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    const site = getSiteUrl();
    const redirectTo = new URL(nextPath, site).toString();
    const response = NextResponse.redirect(redirectTo);
    const cookieOpts = sessionCookieOpts();

    applyExclusiveCustomSession(response, "facebook");
    response.cookies.set("auth_token", sessionToken, cookieOpts);
    response.cookies.set("user_email", email, cookieOpts);
    response.cookies.set("user_name", name, cookieOpts);
    response.cookies.set(FACEBOOK_STATE_COOKIE, "", {
      ...facebookAuthCookieOpts(0),
      maxAge: 0,
    });

    return response;
  } catch (err) {
    console.error("[facebook/callback]", err);
    return redirectWithFacebookError(from, "facebook_server_error", nextPath);
  }
}
