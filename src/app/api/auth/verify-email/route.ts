// app/api/auth/verify-email/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const BASE = process.env.WC_API_BASE!;
const CK = process.env.WC_CONSUMER_KEY;
const CS = process.env.WC_CONSUMER_SECRET;
const RESET_SECRET = process.env.RESET_TOKEN_SECRET!; // ✅ 同一個 secret

function basicAuth() {
  if (!CK || !CS) throw new Error("缺少 WooCommerce consumer key/secret");
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

type VerifyTokenPayload = {
  type: "verify-email";
  email: string;
  customerId?: number;
  iat: number;
  exp: number;
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || "");

    if (!token) {
      return NextResponse.json(
        { ok: false, message: "缺少驗證 token" },
        { status: 400 }
      );
    }

    let payload: VerifyTokenPayload;
    try {
      payload = jwt.verify(token, RESET_SECRET) as VerifyTokenPayload;
    } catch (err) {
      console.error("verify email token error:", err);
      return NextResponse.json(
        { ok: false, message: "驗證連結無效或已過期" },
        { status: 400 }
      );
    }

    if (payload.type !== "verify-email" || !payload.email) {
      return NextResponse.json(
        { ok: false, message: "驗證連結無效" },
        { status: 400 }
      );
    }

    const headers = {
      Authorization: basicAuth(),
      "Content-Type": "application/json",
    };

    let customerId = payload.customerId;

    // 如果 token 裡沒有 customerId，就用 email 再查一次
    if (!customerId) {
      const q = await fetch(
        `${BASE}/wp-json/wc/v3/customers?email=${encodeURIComponent(
          payload.email
        )}`,
        { headers, cache: "no-store" }
      );
      if (!q.ok) {
        const txt = await q.text();
        console.error("find customer when verify email error:", q.status, txt);
        return NextResponse.json(
          { ok: false, message: "找不到對應的會員資料" },
          { status: 400 }
        );
      }
      const arr = (await q.json().catch(() => [])) as any[];
      if (!Array.isArray(arr) || arr.length === 0) {
        return NextResponse.json(
          { ok: false, message: "找不到對應的會員資料" },
          { status: 400 }
        );
      }
      customerId = arr[0].id;
    }

    // 更新 email_verified meta（簡單版：新增一筆 value=1）
    const res = await fetch(`${BASE}/wp-json/wc/v3/customers/${customerId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({
        meta_data: [{ key: "email_verified", value: "1" }],
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      console.error("verify email update error:", res.status, txt);
      return NextResponse.json(
        { ok: false, message: "驗證失敗，請稍後再試。" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, message: "信箱驗證完成，您現在可以登入了。" },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (e) {
    console.error("verify-email error:", e);
    return NextResponse.json(
      { ok: false, message: "系統錯誤，請稍後再試。" },
      { status: 500 }
    );
  }
}