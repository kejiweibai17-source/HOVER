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

type LineProfile = {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
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
    error_description?: string;
  };

  if (!verifyRes.ok || !profile?.sub) {
    console.error("[line/callback] verify error:", profile);
    throw new Error("line_verify_failed");
  }

  return profile;
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
  return Array.isArray(arr) && arr.length > 0 ? (arr[0] as Record<string, unknown>) : null;
}

async function upsertLineCustomer(profile: LineProfile) {
  const headers = authHeaders();
  if (!headers) throw new Error("woo_config_missing");

  const lineUserId = String(profile.sub);
  const email = String(profile.email || "").trim().toLowerCase() ||
    lineSyntheticEmail(lineUserId);
  const name = String(profile.name || "").trim();
  const picture = String(profile.picture || "").trim();
  const [first, ...rest] = name.split(/\s+/);
  const last = rest.join(" ");

  const metaBase = [
    { key: "email_verified", value: "1" },
    { key: "oauth_provider", value: "line" },
    { key: "social_login_line_id", value: lineUserId },
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
    console.error("[line/callback] update failed:", await upd.text().catch(() => ""));
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
  console.error("[line/callback] create failed:", errText);
  throw new Error("create_user_failed");
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
  const from: "login" | "register" = state?.from === "register" ? "register" : "login";

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
    console.error("[line/callback] missing RESET_TOKEN_SECRET / NEXTAUTH_SECRET");
    return redirectWithLineError(from, "line_config", nextPath);
  }

  if (!BASE || !CK || !CS) {
    return redirectWithLineError(from, "line_config", nextPath);
  }

  try {
    const profile = await exchangeLineToken(code);
    const user = await upsertLineCustomer(profile);

    const email = String(user?.email || profile.email || "").trim().toLowerCase();
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
        lineUserId: profile.sub,
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
