// app/api/auth/logout/route.ts
import { NextResponse } from "next/server";

const isProd = process.env.NODE_ENV === "production";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;

type CookieOpts = {
  httpOnly?: boolean;
  sameSite?: "lax" | "strict" | "none";
  secure?: boolean;
  path?: string;
  domain?: string;
  maxAge?: number;
};

function clearOpts(): CookieOpts {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    domain: COOKIE_DOMAIN, // 注意：如果你的 auth_token 寫入時沒指定 domain，這裡有指定可能會清不掉，若有問題可暫時拿掉這行
    maxAge: 0,
  };
}

export async function POST() {
  const res = NextResponse.json(
    { success: true },
    { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
  );

  // 1) 你的自家 JWT cookies
  // ✅ 修改這裡：加上 "auth_token"
  const customCookies = ["jwt", "user_email", "user_name", "auth_token"];

  // 2) NextAuth 相關 cookies
  const nextAuthCookies = [
    "next-auth.session-token",
    "__Secure-next-auth.session-token",
    "next-auth.csrf-token",
    "__Host-next-auth.csrf-token",
    "next-auth.pkce.code_verifier",
    "next-auth.state",
  ];

  for (const name of [...customCookies, ...nextAuthCookies]) {
    // 針對 auth_token，為了保險起見，我們用最乾淨的方式清（不帶 domain），避免因為 domain 設定不同而清不掉
    if (name === "auth_token") {
      res.cookies.set(name, "", { path: "/", maxAge: 0 });
    } else {
      res.cookies.set(name, "", clearOpts());
    }
  }

  return res;
}