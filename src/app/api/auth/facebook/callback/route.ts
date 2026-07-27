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

function basicAuth() {
  if (!CK || !CS) return undefined;
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

function authHeaders() {
  const auth = basicAuth();
  if (!auth) return null;
  return {
    Authorization: auth,
    "Content-Type": "application/json",
  };
}

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

  const tokenUrl = new URL("https://graph.facebook.com/v21.0/oauth/access_token");
  tokenUrl.searchParams.set("client_id", clientId);
  tokenUrl.searchParams.set("client_secret", clientSecret);
  tokenUrl.searchParams.set("redirect_uri", callbackUrl);
  tokenUrl.searchParams.set("code", code);

  const tokenRes = await fetch(tokenUrl.toString(), { cache: "no-store" });
  const tokenData = (await tokenRes.json().catch(() => ({}))) as {
    access_token?: string;
    error?: { message?: string };
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
    error?: { message?: string };
  };

  if (!profileRes.ok || !profile?.id) {
    console.error("[facebook/callback] profile error:", profile);
    throw new Error("facebook_profile_failed");
  }

  return {
    id: String(profile.id),
    email: profile.email ? String(profile.email).trim().toLowerCase() : undefined,
    name: profile.name ? String(profile.name).trim() : undefined,
    pictureUrl: profile.picture?.data?.url
      ? String(profile.picture.data.url)
      : undefined,
  };
}

async function findCustomerByEmail(email: string) {
  const headers = authHeaders();
  if (!headers) return null;

  const res = await fetch(
    `${BASE}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}&role=all`,
    { headers, cache: "no-store" },
  );
  if (!res.ok) return null;
  const arr = (await res.json().catch(() => [])) as unknown[];
  return Array.isArray(arr) && arr.length > 0
    ? (arr[0] as Record<string, unknown>)
    : null;
}

async function upsertFacebookCustomer(profile: FacebookProfile) {
  const headers = authHeaders();
  if (!headers) throw new Error("woo_config_missing");

  const facebookUserId = String(profile.id);
  const email =
    String(profile.email || "").trim().toLowerCase() ||
    facebookSyntheticEmail(facebookUserId);
  const name = String(profile.name || "").trim();
  const picture = String(profile.pictureUrl || "").trim();
  const [first, ...rest] = name.split(/\s+/);
  const last = rest.join(" ");

  const metaBase = [
    { key: "email_verified", value: "1" },
    { key: "oauth_provider", value: "facebook" },
    { key: "social_login_facebook_id", value: facebookUserId },
  ];
  if (picture) metaBase.push({ key: "avatar_url", value: picture });
  if (name) metaBase.push({ key: "oauth_display_name", value: name });

  const existing = await findCustomerByEmail(email);
  if (existing?.id) {
    const patch: Record<string, unknown> = { meta_data: metaBase };
    if (first && !String(existing.first_name || "").trim()) {
      patch.first_name = first;
      if (last) patch.last_name = last;
    }
    const upd = await fetch(`${BASE}/wp-json/wc/v3/customers/${existing.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(patch),
      cache: "no-store",
    });
    if (upd.ok) return upd.json();
    console.error(
      "[facebook/callback] update failed:",
      await upd.text().catch(() => ""),
    );
    return existing;
  }

  const createRes = await fetch(`${BASE}/wp-json/wc/v3/customers`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email,
      username: email,
      first_name: first || "",
      last_name: last || "",
      password:
        Math.random().toString(36).slice(2, 12) +
        Math.random().toString(36).slice(2, 12),
      meta_data: metaBase,
    }),
    cache: "no-store",
  });

  if (createRes.ok) return createRes.json();

  const errText = await createRes.text().catch(() => "");
  if (errText.includes("registration-error-email-exists")) {
    const again = await findCustomerByEmail(email);
    if (again) return again;
  }
  console.error("[facebook/callback] create failed:", errText);
  throw new Error("create_user_failed");
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

  if (!JWT_SECRET) {
    console.error(
      "[facebook/callback] missing RESET_TOKEN_SECRET / NEXTAUTH_SECRET",
    );
    return redirectWithFacebookError(from, "facebook_config", nextPath);
  }

  if (!BASE || !CK || !CS) {
    return redirectWithFacebookError(from, "facebook_config", nextPath);
  }

  try {
    const profile = await exchangeFacebookToken(code);
    const user = await upsertFacebookCustomer(profile);

    const email = String(user?.email || profile.email || "")
      .trim()
      .toLowerCase();
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
        facebookUserId: profile.id,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    const site = getSiteUrl();
    const redirectTo = new URL(nextPath, site).toString();
    const response = NextResponse.redirect(redirectTo);
    const cookieOpts = sessionCookieOpts();

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
