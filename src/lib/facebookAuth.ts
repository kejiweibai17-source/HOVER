import {
  getSiteUrl,
  lineAuthCookieOpts,
  redirectWithLineError,
  safeNextPath,
  sessionCookieOpts,
} from "@/lib/lineAuth";

export const FACEBOOK_STATE_COOKIE = "facebook_oauth_state";

export type FacebookOAuthState = {
  csrf: string;
  next: string;
  ref: string;
  from: "login" | "register";
};

export function getFacebookClientId() {
  return String(process.env.FACEBOOK_CLIENT_ID || "").trim();
}

export function getFacebookClientSecret() {
  return String(process.env.FACEBOOK_CLIENT_SECRET || "").trim();
}

export function getFacebookCallbackUrl() {
  const configured = String(process.env.FACEBOOK_CALLBACK_URL || "").trim();
  if (configured) return configured;
  return `${getSiteUrl()}/api/auth/facebook/callback`;
}

export function encodeFacebookState(state: FacebookOAuthState) {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

export function decodeFacebookState(
  raw: string | undefined | null,
): FacebookOAuthState | null {
  if (!raw) return null;
  try {
    const json = Buffer.from(raw, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as Partial<FacebookOAuthState>;
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

export function facebookAuthCookieOpts(maxAge = 60 * 10) {
  return lineAuthCookieOpts(maxAge);
}

export function facebookSyntheticEmail(facebookUserId: string) {
  const id = String(facebookUserId || "")
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 64);
  return `fb_${id || "user"}@users.hover.local`;
}

export function redirectWithFacebookError(
  page: "login" | "register",
  code: string,
  nextPath?: string,
) {
  return redirectWithLineError(page, code, nextPath);
}

export { getSiteUrl, safeNextPath, sessionCookieOpts };
