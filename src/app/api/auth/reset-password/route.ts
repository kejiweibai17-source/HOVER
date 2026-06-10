// src/app/api/auth/reset-password/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

const BASE = process.env.WC_API_BASE!;
const CK = process.env.WC_CONSUMER_KEY!;
const CS = process.env.WC_CONSUMER_SECRET!;
const RESET_SECRET = process.env.RESET_TOKEN_SECRET!;

function basicAuth() {
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

type ResetTokenPayload = {
  type: "reset-password";
  email: string;
  customerId?: number;
  iat: number;
  exp: number;
};

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const token = String(body.token || "");
    const password = String(body.password || "");

    if (!token || !password) {
      return NextResponse.json(
        { ok: false, message: "缺少 token 或新密碼" },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, message: "新密碼長度至少 6 碼" },
        { status: 400 }
      );
    }

    let payload: ResetTokenPayload;
    try {
      payload = jwt.verify(token, RESET_SECRET) as ResetTokenPayload;
    } catch (err: any) {
      console.error("verify reset token error:", err);
      return NextResponse.json(
        { ok: false, message: "重設連結無效或已過期，請重新申請。" },
        { status: 400 }
      );
    }

    if (payload.type !== "reset-password" || !payload.email) {
      return NextResponse.json(
        { ok: false, message: "重設連結無效。" },
        { status: 400 }
      );
    }

    // 1) 先找出對應的 Woo customer
    const headers = {
      Authorization: basicAuth(),
      "Content-Type": "application/json",
    };

    let customerId = payload.customerId;

    if (!customerId) {
      const q = await fetch(
        `${BASE}/wp-json/wc/v3/customers?email=${encodeURIComponent(
          payload.email
        )}`,
        { headers, cache: "no-store" }
      );
      if (!q.ok) {
        const txt = await q.text();
        console.error("find customer when reset error:", q.status, txt);
        return NextResponse.json(
          { ok: false, message: "找不到對應的會員資料。" },
          { status: 400 }
        );
      }
      const arr = (await q.json().catch(() => [])) as any[];
      if (!Array.isArray(arr) || arr.length === 0) {
        return NextResponse.json(
          { ok: false, message: "找不到對應的會員資料。" },
          { status: 400 }
        );
      }
      customerId = arr[0].id;
    }

    // 2) 用 WooCommerce REST API 更新密碼
    const res = await fetch(
      `${BASE}/wp-json/wc/v3/customers/${customerId}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ password }),
      }
    );

    if (!res.ok) {
      const txt = await res.text();
      console.error("reset password update error:", res.status, txt);
      return NextResponse.json(
        { ok: false, message: "重設密碼失敗，請稍後再試。" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { ok: true, message: "密碼已重設成功。" },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (e: any) {
    console.error("reset-password error:", e);
    return NextResponse.json(
      { ok: false, message: "系統錯誤，請稍後再試。" },
      { status: 500 }
    );
  }
}
