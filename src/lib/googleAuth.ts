import {
  type LineOAuthFrom,
  getSiteUrl,
  lineAuthCookieOpts,
  redirectWithLineError,
  safeNextPath,
} from "@/lib/lineAuth";

export const GOOGLE_STATE_COOKIE = "google_oauth_state";

export type GoogleOAuthState = {
  csrf: string;
  next: string;
  ref: string;
  from: LineOAuthFrom;
};

export function getGoogleClientId() {
  return String(process.env.GOOGLE_CLIENT_ID || "").trim();
}

export function getGoogleClientSecret() {
  return String(process.env.GOOGLE_CLIENT_SECRET || "").trim();
}

/** 會員中心綁定專用 callback（與 NextAuth `/api/auth/callback/google` 分開） */
export function getGoogleBindCallbackUrl() {
  const configured = String(process.env.GOOGLE_BIND_CALLBACK_URL || "").trim();
  if (configured) return configured;
  return `${getSiteUrl()}/api/auth/google/callback`;
}

export function encodeGoogleState(state: GoogleOAuthState) {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

export function decodeGoogleState(
  raw: string | undefined | null,
): GoogleOAuthState | null {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as Partial<GoogleOAuthState>;
    if (!parsed?.csrf) return null;
    return {
      csrf: String(parsed.csrf),
      next: safeNextPath(parsed.next),
      ref: String(parsed.ref || "").trim(),
      from:
        parsed.from === "register"
          ? "register"
          : parsed.from === "account"
            ? "account"
            : "login",
    };
  } catch {
    return null;
  }
}

export function googleAuthCookieOpts(maxAge = 60 * 10) {
  return lineAuthCookieOpts(maxAge);
}

export function redirectWithGoogleError(
  page: LineOAuthFrom,
  code: string,
  nextPath?: string,
) {
  return redirectWithLineError(page, code, nextPath);
}

export {
  getSiteUrl,
  safeNextPath,
  sessionCookieOpts,
  withBoundSuccessPath,
} from "@/lib/lineAuth";
