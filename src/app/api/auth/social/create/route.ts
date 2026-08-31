import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import {
  applyExclusiveCustomSession,
  applyExclusiveEmailSession,
  upsertSocialCustomer,
} from "@/lib/socialAccount";
import {
  clearSocialPendingCookie,
  SOCIAL_PENDING_COOKIE,
  verifySocialPending,
} from "@/lib/socialLink";
import { grantWelcomeGiftIfEligible } from "@/lib/welcomeGift";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JWT_SECRET =
  process.env.RESET_TOKEN_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.JWT_SECRET ||
  "secret";

const isProd = process.env.NODE_ENV === "production";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

function cookieOpts() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    domain: COOKIE_DOMAIN,
    maxAge: 7 * 24 * 60 * 60,
  };
}

/** 從未基本註冊：直接用第三方建立新會員（手機之後結帳再補） */
export async function POST() {
  try {
    const pendingToken = cookies().get(SOCIAL_PENDING_COOKIE)?.value || "";
    const pending = pendingToken ? verifySocialPending(pendingToken) : null;
    if (!pending) {
      return NextResponse.json(
        { ok: false, message: "社群登入已過期，請重新使用第三方登入" },
        { status: 401 },
      );
    }

    const user = await upsertSocialCustomer({
      provider: pending.provider,
      providerUserId: pending.providerUserId,
      email: pending.email || "",
      name: pending.name,
      picture: pending.picture,
      emailVerified: Boolean(pending.emailVerified || pending.email),
    });

    const email = String(user?.email || pending.email || "")
      .trim()
      .toLowerCase();
    if (!email) {
      return NextResponse.json(
        { ok: false, message: "無法建立會員：缺少 Email" },
        { status: 400 },
      );
    }

    try {
      const customerId = Number(user?.id || 0);
      if (customerId) {
        await grantWelcomeGiftIfEligible(
          customerId,
          email,
          Array.isArray(user?.meta_data) ? user.meta_data : undefined,
        );
      }
    } catch (e) {
      console.error("grantWelcomeGift (social create) error:", e);
    }

    const name =
      String(user?.first_name || pending.name || "").trim() ||
      email.split("@")[0] ||
      "HOVER 會員";

    const sessionToken = jwt.sign(
      {
        id: user.id,
        email,
        role: user.role || "customer",
        name,
        provider: pending.provider,
        providerUserId: pending.providerUserId,
      },
      JWT_SECRET,
      { expiresIn: "7d" },
    );

    const next = String(pending.next || "/account");
    const res = NextResponse.json({
      ok: true,
      next: next.startsWith("/") ? next : "/account",
      message: "已建立新會員",
    });

    if (pending.provider === "google") {
      applyExclusiveEmailSession(res);
    } else {
      applyExclusiveCustomSession(res, pending.provider);
    }
    res.cookies.set("auth_token", sessionToken, cookieOpts());
    res.cookies.set("user_email", email, cookieOpts());
    res.cookies.set("user_name", name, cookieOpts());
    clearSocialPendingCookie(res);
    return res;
  } catch (e) {
    console.error("[social/create]", e);
    return NextResponse.json(
      { ok: false, message: "建立會員失敗，請稍後再試" },
      { status: 500 },
    );
  }
}
