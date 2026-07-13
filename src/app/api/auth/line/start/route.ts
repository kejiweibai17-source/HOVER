import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  LINE_STATE_COOKIE,
  encodeLineState,
  getLineCallbackUrl,
  getLineChannelId,
  getSiteUrl,
  lineAuthCookieOpts,
  redirectWithLineError,
  safeNextPath,
} from "@/lib/lineAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNextPath(url.searchParams.get("next"));
  const ref = String(url.searchParams.get("ref") || "").trim();
  const from = url.searchParams.get("from") === "register" ? "register" : "login";

  const channelId = getLineChannelId();
  const callbackUrl = getLineCallbackUrl();

  if (!channelId || !callbackUrl) {
    console.error("[line/start] missing LINE_CHANNEL_ID or LINE_CALLBACK_URL");
    return redirectWithLineError(from, "line_config", next);
  }

  const state = encodeLineState({
    csrf: randomUUID(),
    next,
    ref,
    from,
  });

  const authorize = new URL("https://access.line.me/oauth2/v2.1/authorize");
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", channelId);
  authorize.searchParams.set("redirect_uri", callbackUrl);
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("scope", "profile openid email");
  authorize.searchParams.set("bot_prompt", "normal");
  authorize.searchParams.set("nonce", randomUUID());

  const res = NextResponse.redirect(authorize.toString());
  res.cookies.set(LINE_STATE_COOKIE, state, lineAuthCookieOpts(60 * 10));

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
