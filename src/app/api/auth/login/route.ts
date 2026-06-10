// app/api/auth/login/route.ts
import { NextResponse } from "next/server";

const BASE = process.env.WC_API_BASE;
const CK = process.env.WC_CONSUMER_KEY;
const CS = process.env.WC_CONSUMER_SECRET;

const isProd = process.env.NODE_ENV === "production";
const COOKIE_DOMAIN = process.env.COOKIE_DOMAIN || undefined;
const JWT_MAX_AGE_SECONDS = process.env.JWT_MAX_AGE_SECONDS
  ? Number(process.env.JWT_MAX_AGE_SECONDS)
  : 7 * 24 * 60 * 60;

function cookieOpts(
  extra?: Partial<Parameters<NextResponse["cookies"]["set"]>[1]>
) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProd,
    path: "/",
    domain: COOKIE_DOMAIN,
    ...(JWT_MAX_AGE_SECONDS ? { maxAge: JWT_MAX_AGE_SECONDS } : {}),
 
  };
}

function basicAuth() {
  if (!CK || !CS) return undefined;
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

export async function POST(req: Request) {
  try {
    if (!BASE) {
      return NextResponse.json(
        { message: "環境變數 WC_API_BASE 未設定" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const username: string = String(body?.username || "").trim();
    const password: string = String(body?.password || "").trim();

    if (!username || !password) {
      return NextResponse.json(
        { message: "請輸入帳號/信箱與密碼" },
        { status: 400 }
      );
    }

    // 1) 先打 WordPress JWT 端點驗證帳密
    const wpRes = await fetch(`${BASE}/wp-json/jwt-auth/v1/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });

    const text = await wpRes.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      data = {};
    }

    if (!wpRes.ok || !data?.token) {
      const msg =
        data?.message ||
        (wpRes.status === 401 ? "帳號或密碼錯誤" : `登入失敗（${wpRes.status}）`);
      return NextResponse.json(
        { message: msg, code: data?.code || String(wpRes.status) },
        { status: wpRes.status || 401 }
      );
    }

    const email = data.user_email || "";

  // 2) 檢查 Woo customer 是否已完成 email 驗證
    let isBlocked = false; // 🌟 改為「預設不阻擋」
    const authHeader = basicAuth();

    if (authHeader && email) {
      try {
        const custRes = await fetch(
          `${BASE}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}`,
          {
            headers: { Authorization: authHeader },
            cache: "no-store",
          }
        );

        if (custRes.ok) {
          const arr = (await custRes.json().catch(() => [])) as any[];
          const customer = Array.isArray(arr) && arr.length > 0 ? arr[0] : null;

          if (customer?.meta_data) {
            // 尋找是否有 email_verified 標記
            const verifyMeta = customer.meta_data.find(
              (m: any) => m?.key === "email_verified"
            );
            
            // 🌟 關鍵修正：只有當標記「明確存在」且值為 "0" 時，才進行阻擋
            // 這樣沒有標記的管理員 (Admin) 與舊會員就能安全登入
            if (verifyMeta && String(verifyMeta.value) === "0") {
              isBlocked = true;
            }
          }
        }
      } catch (e) {
        console.error("check email_verified error:", e);
      }
    }

    if (isBlocked) {
      return NextResponse.json(
        {
          message: "此帳號尚未完成信箱驗證，請先至信箱點擊驗證連結。",
          code: "email_not_verified",
        },
        { status: 403 }
      );
    }

    // 3) 通過驗證 → 設 cookie
    const res = NextResponse.json(
      {
        ok: true,
        user: {
          email: data.user_email || "",
          name:
            data.user_display_name ||
            data.user_nicename ||
            data.user_email ||
            "",
        },
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );

    res.cookies.set("jwt", String(data.token), cookieOpts());
    if (data.user_email) {
      res.cookies.set("user_email", String(data.user_email), cookieOpts());
    }
    res.cookies.set(
      "user_name",
      String(
        data.user_display_name || data.user_nicename || data.user_email || ""
      ),
      cookieOpts()
    );

    return res;
  } catch (err: any) {
    console.error("login error:", err);
    return NextResponse.json(
      { message: err?.message || "登入例外錯誤" },
      { status: 500 }
    );
  }
}
