import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SITE_PREVIEW_COOKIE,
  getPreviewSecret,
  isConstructionModeEnabled,
  isConstructionPassthrough,
} from "@/lib/siteConstruction";

/** Facebook App 審核需可讀取的政策頁（其餘維持 noindex） */
const INDEXABLE = new Set([
  "/privacy",
  "/terms",
  "/data-deletion",
  "/fb-data-deletion.html",
]);

const PREVIEW_COOKIE_MAX_AGE = 60 * 60 * 24 * 14; // 14 天

function applyRobotsHeader(path: string, response: NextResponse) {
  if (INDEXABLE.has(path)) {
    response.headers.set("X-Robots-Tag", "index, follow");
  } else {
    response.headers.set(
      "X-Robots-Tag",
      "noindex, nofollow, noarchive, nosnippet",
    );
  }
  return response;
}

function hasValidPreviewCookie(request: NextRequest, secret: string): boolean {
  if (!secret) return false;
  const cookie = request.cookies.get(SITE_PREVIEW_COOKIE)?.value || "";
  return cookie === secret;
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
      return applyRobotsHeader(path, res);
    }

    if (secret && key && key === secret) {
      const next = request.nextUrl.searchParams.get("next") || "/";
      const safe = next.startsWith("/") ? next : "/";
      const res = NextResponse.redirect(new URL(safe, request.url));
      res.cookies.set(SITE_PREVIEW_COOKIE, secret, previewCookieOpts(PREVIEW_COOKIE_MAX_AGE));
      return applyRobotsHeader(path, res);
    }

    // 錯誤密鑰 → 建置中頁
    const res = NextResponse.redirect(new URL("/coming-soon", request.url));
    return applyRobotsHeader(path, res);
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
      return applyRobotsHeader(path, res);
    }
  }

  const response = NextResponse.next();
  return applyRobotsHeader(path, response);
}

export const config = {
  // 略過靜態資源與 Next 內部路徑
  matcher: [
    "/((?!_next/static|_next/image|images/|favicon.ico|icon.png|icon-48.png|apple-touch-icon.png|fonts/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf)$).*)",
  ],
};
