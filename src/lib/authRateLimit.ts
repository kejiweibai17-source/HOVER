/**
 * 登入／註冊暴力破解防護（記憶體 + 簽章 Cookie）
 * - 同 IP、同帳號（手機）分開計次
 * - Cookie 讓 serverless 冷啟動後仍可短暫記住鎖定
 */

import { createHmac, timingSafeEqual } from "crypto";
import type { NextRequest } from "next/server";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const LOCK_MS = 15 * 60 * 1000;
const COOKIE_NAME = "hover_auth_rl";

type Bucket = {
  count: number;
  windowStart: number;
  lockedUntil: number;
};

const buckets = new Map<string, Bucket>();

function secret(): string {
  return (
    process.env.RESET_TOKEN_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.JWT_SECRET ||
    "secret"
  );
}

function now() {
  return Date.now();
}

function prune(bucket: Bucket, t: number): Bucket {
  if (bucket.lockedUntil && t >= bucket.lockedUntil) {
    return { count: 0, windowStart: t, lockedUntil: 0 };
  }
  if (t - bucket.windowStart > WINDOW_MS) {
    return { count: 0, windowStart: t, lockedUntil: bucket.lockedUntil };
  }
  return bucket;
}

function getBucket(key: string): Bucket {
  const t = now();
  const cur = buckets.get(key) || { count: 0, windowStart: t, lockedUntil: 0 };
  const next = prune(cur, t);
  buckets.set(key, next);
  return next;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

type CookiePayload = {
  k: string;
  c: number;
  u: number;
};

function readCookie(
  req: NextRequest | Request,
  key: string,
): CookiePayload | null {
  try {
    const raw =
      "cookies" in req && typeof (req as NextRequest).cookies?.get === "function"
        ? (req as NextRequest).cookies.get(COOKIE_NAME)?.value || ""
        : String(
            (req.headers.get("cookie") || "")
              .split(";")
              .map((s) => s.trim())
              .find((s) => s.startsWith(`${COOKIE_NAME}=`))
              ?.slice(COOKIE_NAME.length + 1) || "",
          );
    if (!raw) return null;
    const [body, sig] = raw.split(".");
    if (!body || !sig || !safeEqual(sign(body), sig)) return null;
    const parsed = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as CookiePayload;
    if (parsed.k !== key) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCookieValue(payload: CookiePayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  return `${body}.${sign(body)}`;
}

export function clientIp(req: Request): string {
  const xf = req.headers.get("x-forwarded-for") || "";
  const real = req.headers.get("x-real-ip") || "";
  const ip = (xf.split(",")[0] || real || "").trim();
  return ip || "unknown";
}

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number; message: string };

export function checkAuthRateLimit(opts: {
  req: Request;
  action: "login" | "register" | "social_bind";
  identifier?: string;
}): RateLimitResult {
  const ip = clientIp(opts.req);
  const idRaw = String(opts.identifier || "").trim().toLowerCase();
  const id = idRaw.includes("@")
    ? idRaw.slice(0, 80)
    : idRaw.replace(/\D/g, "").slice(0, 20);
  const keys = [
    `${opts.action}:ip:${ip}`,
    id ? `${opts.action}:id:${id}` : "",
  ].filter(Boolean);

  const t = now();
  let worstLock = 0;
  let minRemaining = MAX_ATTEMPTS;

  for (const key of keys) {
    let bucket = getBucket(key);
    const cookie = readCookie(opts.req, key);
    if (cookie?.u && cookie.u > t) {
      bucket = {
        ...bucket,
        lockedUntil: Math.max(bucket.lockedUntil || 0, cookie.u),
        count: Math.max(bucket.count, cookie.c || 0),
      };
      buckets.set(key, bucket);
    }
    if (bucket.lockedUntil > t) {
      worstLock = Math.max(worstLock, bucket.lockedUntil);
    }
    minRemaining = Math.min(
      minRemaining,
      Math.max(0, MAX_ATTEMPTS - bucket.count),
    );
  }

  if (worstLock > t) {
    const retryAfterSec = Math.ceil((worstLock - t) / 1000);
    return {
      ok: false,
      retryAfterSec,
      message: `嘗試次數過多，請 ${Math.ceil(retryAfterSec / 60)} 分鐘後再試`,
    };
  }

  return { ok: true, remaining: minRemaining };
}

export function recordAuthFailure(opts: {
  req: Request;
  action: "login" | "register" | "social_bind";
  identifier?: string;
}): { cookieValue: string | null; locked: boolean; retryAfterSec: number } {
  const ip = clientIp(opts.req);
  const idRaw = String(opts.identifier || "").trim().toLowerCase();
  const id = idRaw.includes("@")
    ? idRaw.slice(0, 80)
    : idRaw.replace(/\D/g, "").slice(0, 20);
  const keys = [
    `${opts.action}:ip:${ip}`,
    id ? `${opts.action}:id:${id}` : "",
  ].filter(Boolean);

  const t = now();
  let lockedUntil = 0;
  let primaryKey = keys[0];
  let primaryCount = 0;

  for (const key of keys) {
    const bucket = getBucket(key);
    const nextCount = bucket.count + 1;
    const next: Bucket = {
      count: nextCount,
      windowStart: bucket.windowStart || t,
      lockedUntil:
        nextCount >= MAX_ATTEMPTS ? t + LOCK_MS : bucket.lockedUntil || 0,
    };
    buckets.set(key, next);
    if (next.lockedUntil > lockedUntil) {
      lockedUntil = next.lockedUntil;
      primaryKey = key;
      primaryCount = next.count;
    }
  }

  const cookieValue = writeCookieValue({
    k: primaryKey,
    c: primaryCount,
    u: lockedUntil || t + WINDOW_MS,
  });

  return {
    cookieValue,
    locked: lockedUntil > t,
    retryAfterSec: lockedUntil > t ? Math.ceil((lockedUntil - t) / 1000) : 0,
  };
}

export function clearAuthRateLimitCookie(): {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    sameSite: "lax";
    secure: boolean;
    path: string;
    maxAge: number;
  };
} {
  return {
    name: COOKIE_NAME,
    value: "",
    options: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    },
  };
}

export function authRateLimitCookieOptions(maxAgeSec = Math.ceil(LOCK_MS / 1000)) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSec,
  };
}

export const AUTH_RATE_LIMIT = {
  maxAttempts: MAX_ATTEMPTS,
  windowMs: WINDOW_MS,
  lockMs: LOCK_MS,
  cookieName: COOKIE_NAME,
};
