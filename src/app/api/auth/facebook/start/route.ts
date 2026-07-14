import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  FACEBOOK_STATE_COOKIE,
  encodeFacebookState,
  facebookAuthCookieOpts,
  getFacebookCallbackUrl,
  getFacebookClientId,
  getSiteUrl,
  redirectWithFacebookError,
  safeNextPath,
} from "@/lib/facebookAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNextPath(url.searchParams.get("next"));
  const ref = String(url.searchParams.get("ref") || "").trim();
  const from =
    url.searchParams.get("from") === "register" ? "register" : "login";

  const clientId = getFacebookClientId();
  const callbackUrl = getFacebookCallbackUrl();

  if (!clientId || !callbackUrl) {
    console.error(
      "[facebook/start] missing FACEBOOK_CLIENT_ID or FACEBOOK_CALLBACK_URL",
    );
    return redirectWithFacebookError(from, "facebook_config", next);
  }

  const state = encodeFacebookState({
    csrf: randomUUID(),
    next,
    ref,
    from,
  });

  const authorize = new URL("https://www.facebook.com/v21.0/dialog/oauth");
  authorize.searchParams.set("client_id", clientId);
  authorize.searchParams.set("redirect_uri", callbackUrl);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("scope", "email,public_profile");

  const res = NextResponse.redirect(authorize.toString());
  res.cookies.set(FACEBOOK_STATE_COOKIE, state, facebookAuthCookieOpts(60 * 10));

  if (ref) {
    const isHttps = getSiteUrl().startsWith("https://");
    res.cookies.set("uf_ref", ref, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
      secure: isHttps,
    });
  }

  return res;
}
