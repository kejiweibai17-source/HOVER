// src/app/api/auth/resend-verification/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

const BASE = process.env.WC_API_BASE!;
const CK = process.env.WC_CONSUMER_KEY!;
const CS = process.env.WC_CONSUMER_SECRET!;
const RESET_SECRET = process.env.RESET_TOKEN_SECRET!;

function getBaseUrl() {
  let url = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  if (url.startsWith("hhttp")) url = url.replace("hhttp", "http");
  if (process.env.VERCEL_URL && !process.env.NEXT_PUBLIC_SITE_URL) {
    url = `https://${process.env.VERCEL_URL}`;
  }
  return url.replace(/\/$/, "");
}

function basicAuth() {
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP 設定不完整：請在 .env.local 填入 SMTP_USER、SMTP_PASS");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

async function findCustomerByEmail(email: string) {
  const res = await fetch(
    `${BASE}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}&role=all`,
    {
      headers: { Authorization: basicAuth() },
      cache: "no-store",
    },
  );
  if (!res.ok) return null;
  const arr = (await res.json().catch(() => [])) as any[];
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
}

function isUnverified(customer: any) {
  const meta: any[] = Array.isArray(customer?.meta_data)
    ? customer.meta_data
    : [];
  const verifyMeta = meta.find((m) => m?.key === "email_verified");
  return Boolean(verifyMeta && String(verifyMeta.value) === "0");
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();

    if (!email || !/.+@.+\..+/.test(email)) {
      return NextResponse.json(
        { ok: false, message: "請輸入正確的 Email" },
        { status: 400 },
      );
    }

    if (!BASE || !CK || !CS || !RESET_SECRET) {
      return NextResponse.json(
        { ok: false, message: "系統設定不完整" },
        { status: 500 },
      );
    }

    const customer = await findCustomerByEmail(email);

    // 模糊回覆，避免探測
    if (!customer) {
      return NextResponse.json({
        ok: true,
        message: "如果此 Email 尚未驗證，我們已重新寄出驗證信。",
      });
    }

    if (!isUnverified(customer)) {
      return NextResponse.json({
        ok: true,
        message: "此帳號已完成驗證，請直接登入。",
        alreadyVerified: true,
      });
    }

    const token = jwt.sign(
      {
        type: "verify-email",
        email,
        customerId: customer.id,
      },
      RESET_SECRET,
      { expiresIn: "15m" },
    );

    const url = new URL("/verify-email", getBaseUrl());
    url.searchParams.set("token", token);

    try {
      const transporter = createTransport();
      await transporter.verify();
      const mailFrom = process.env.SMTP_USER!;

      await transporter.sendMail({
        from: `"HOVER 威爾特" <${mailFrom}>`,
        to: email,
        subject: "HOVER – 會員信箱驗證（重新寄送）",
        html: `
          <div style="font-family: system-ui, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
            <h2 style="color: #222;">會員信箱驗證</h2>
            <p>親愛的會員您好：</p>
            <p>這是重新寄送的驗證信，請點擊下方按鈕完成信箱驗證：</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${url.toString()}" target="_blank"
                 style="display: inline-block; padding: 14px 28px; background-color: #2a514d; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
                完成信箱驗證
              </a>
            </div>
            <p style="font-size: 13px; color: #666; word-break: break-all;">${url.toString()}</p>
            <p style="color: #e63946; font-weight: bold;">此驗證連結將在 15 分鐘後失效。</p>
            <p style="margin-top: 24px; font-size: 12px; color: #999;">HOVER 威爾特</p>
          </div>
        `,
      });
    } catch (e: any) {
      console.error("resend verification email error:", e);
      return NextResponse.json(
        {
          ok: false,
          message:
            e?.message?.includes("SMTP")
              ? "寄信服務尚未設定完成，請聯絡網站管理員。"
              : "驗證信寄送失敗，請稍後再試。",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "驗證信已重新寄出，請至信箱查收（含垃圾郵件資料夾）。",
    });
  } catch (e) {
    console.error("resend-verification error:", e);
    return NextResponse.json(
      { ok: false, message: "系統錯誤，請稍後再試。" },
      { status: 500 },
    );
  }
}
