import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SITE_PREVIEW_COOKIE,
  getPreviewSecret,
  isConstructionModeEnabled,
  isConstructionPassthrough,
} from "@/lib/siteConstruction";

/** 建置中仍允許索引的政策頁 */
const INDEXABLE_DURING_CONSTRUCTION = new Set([
  "/privacy",
  "/terms",
  "/data-deletion",
  "/fb-data-deletion.html",
]);

/** 正式上線後仍不收錄的私有路徑 */
const PRIVATE_NOINDEX_PREFIXES = [
  "/account",
  "/cart",
  "/checkout",
  "/admin",
  "/api",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/thank-you",
  "/preview",
  "/coming-soon",
  "/auth",
];

const PREVIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 14; // 14 天

function isPrivateNoindexPath(path: string): boolean {
  return PRIVATE_NOINDEX_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}

function applyRobotsHeader(
  path: string,
  response: NextResponse,
  constructionOn: boolean,
) {
  // 建置中：僅政策頁可索引
  if (constructionOn && !INDEXABLE_DURING_CONSTRUCTION.has(path)) {
    response.headers.set(
      "X-Robots-Tag",
      "noindex, nofollow, noarchive, nosnippet",
    );
    return response;
  }

  // 正式上線：公開頁可索引；會員／結帳等私有頁維持 noindex
  if (!constructionOn && isPrivateNoindexPath(path)) {
    response.headers.set(
      "X-Robots-Tag",
      "noindex, nofollow, noarchive, nosnippet",
    );
    return response;
  }

  response.headers.set("X-Robots-Tag", "index, follow");
  return response;
}

function hasValidPreviewCookie(request: NextRequest, secret: string): boolean {
  if (!secret) return false;
  const cookie = request.cookies.get(SITE_PREVIEW_COOKIE)?.value || "";
  return constantTimeEqual(cookie, secret);
}

/** Edge runtime 沒有 timingSafeEqual，手動做常數時間比對 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

function previewCookieOpts(maxAge: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const constructionOn = isConstructionModeEnabled();
  const secret = getPreviewSecret();

  // 正式上線後：建置中頁不再對外，避免 LINE／社群仍抓到舊 SEO
  if (!constructionOn && (path === "/coming-soon" || path.startsWith("/coming-soon/"))) {
    return applyRobotsHeader(
      path,
      NextResponse.redirect(new URL("/", request.url), 308),
      constructionOn,
    );
  }

  // ── 解鎖／關閉預覽 ──────────────────────────────────────────
  if (path === "/preview") {
    const key = (request.nextUrl.searchParams.get("key") || "").trim();
    const exit = request.nextUrl.searchParams.get("exit") === "1";

    if (exit) {
      const res = NextResponse.redirect(new URL("/coming-soon", request.url));
      res.cookies.set(SITE_PREVIEW_COOKIE, "", {
        ...previewCookieOpts(0),
        maxAge: 0,
      });
      return applyRobotsHeader(path, res, constructionOn);
    }

    if (secret && key && key === secret) {
      const next = request.nextUrl.searchParams.get("next") || "/";
      const safe = next.startsWith("/") ? next : "/";
      const res = NextResponse.redirect(new URL(safe, request.url));
      res.cookies.set(SITE_PREVIEW_COOKIE, secret, previewCookieOpts(PREVIEW_COOKIE_MAX_AGE));
      return applyRobotsHeader(path, res, constructionOn);
    }

    // 錯誤密鑰 → 建置中頁
    const res = NextResponse.redirect(new URL("/coming-soon", request.url));
    return applyRobotsHeader(path, res, constructionOn);
  }

  // ── 建置中閘門 ──────────────────────────────────────────────
  if (constructionOn) {
    const unlocked = hasValidPreviewCookie(request, secret);
    if (!unlocked && !isConstructionPassthrough(path)) {
      // API：回 503，避免誤觸發結帳等；頁面：導向建置中
      if (path.startsWith("/api/")) {
        return NextResponse.json(
          { ok: false, message: "網站建置中", code: "SITE_UNDER_CONSTRUCTION" },
          { status: 503 },
        );
      }
      const res = NextResponse.redirect(new URL("/coming-soon", request.url));
      return applyRobotsHeader(path, res, constructionOn);
    }
  }

  const response = NextResponse.next();
  return applyRobotsHeader(path, response, constructionOn);
}

export const config = {
  // 略過靜態資源、驗證檔、sitemap／robots（避免干擾 Google 擷取）
  matcher: [
    "/((?!_next/static|_next/image|images/|fonts/|favicon.ico|icon.png|icon-48.png|apple-touch-icon.png|robots.txt|sitemap.xml|google[^/]*\\.html|fb-data-deletion.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|xml|txt)$).*)",
  ],
};
