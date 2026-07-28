import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Facebook App 審核需可讀取的政策頁（其餘維持 noindex） */
const INDEXABLE = new Set([
  "/privacy",
  "/terms",
  "/data-deletion",
  "/fb-data-deletion.html",
]);

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const response = NextResponse.next();

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

export const config = {
  // 略過靜態資源與 Next 內部路徑
  matcher: [
    "/((?!_next/static|_next/image|images/|favicon.ico|icon.png|icon-48.png|apple-touch-icon.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
