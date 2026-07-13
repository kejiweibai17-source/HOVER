import { NextResponse } from "next/server";

export const LINE_STATE_COOKIE = "line_oauth_state";

export type LineOAuthState = {
  csrf: string;
  next: string;
  ref: string;
  from: "login" | "register";
};

export function getLineChannelId() {
  return (
    process.env.LINE_CHANNEL_ID ||
    process.env.NEXT_PUBLIC_LINE_CHANNEL_ID ||
    ""
  ).trim();
}

export function getLineChannelSecret() {
  return String(process.env.LINE_CHANNEL_SECRET || "").trim();
}

export function getLineCallbackUrl() {
  const configured = String(process.env.LINE_CALLBACK_URL || "").trim();
  if (configured) return configured;
  return `${getSiteUrl()}/api/auth/line/callback`;
}

export function getSiteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function safeNextPath(raw: string | null | undefined, fallback = "/account") {
  const v = String(raw || "").trim();
  if (!v) return fallback;
  if (/^https?:\/\//i.test(v)) {
    try {
      const u = new URL(v);
      const site = new URL(getSiteUrl());
      if (u.origin === site.origin) return `${u.pathname}${u.search}${u.hash}` || fallback;
    } catch {
      return fallback;
    }
    return fallback;
  }
  return v.startsWith("/") ? v : `/${v}`;
}

export function encodeLineState(state: LineOAuthState) {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

export function decodeLineState(raw: string | undefined | null): LineOAuthState | null {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as Partial<LineOAuthState>;
    if (!parsed?.csrf) return null;
    return {
      csrf: String(parsed.csrf),
      next: safeNextPath(parsed.next),
      ref: String(parsed.ref || "").trim(),
      from: parsed.from === "register" ? "register" : "login",
    };
  } catch {
    return null;
  }
}

export function lineAuthCookieOpts(maxAge = 60 * 10) {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    maxAge,
  };
}

export function sessionCookieOpts(maxAge = 7 * 24 * 60 * 60) {
  const isProd = process.env.NODE_ENV === "production";
  const domain = process.env.COOKIE_DOMAIN || undefined;
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    domain,
    maxAge,
  };
}

export function redirectWithLineError(
  page: "login" | "register",
  code: string,
  nextPath?: string,
) {
  const site = getSiteUrl();
  const url = new URL(`${site}/${page}`);
  url.searchParams.set("error", code);
  if (nextPath) url.searchParams.set("next", nextPath);
  return NextResponse.redirect(url.toString());
}

export function lineSyntheticEmail(lineUserId: string) {
  const id = String(lineUserId || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 64);
  return `line_${id || "user"}@users.hover.local`;
}
