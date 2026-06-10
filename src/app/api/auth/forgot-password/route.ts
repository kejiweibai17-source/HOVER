// src/app/api/auth/forgot-password/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

const BASE = process.env.WC_API_BASE!;
const CK = process.env.WC_CONSUMER_KEY!;
const CS = process.env.WC_CONSUMER_SECRET!;
const RESET_SECRET = process.env.RESET_TOKEN_SECRET!;
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

function basicAuth() {
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

async function findWooCustomerByEmail(email: string) {
  const res = await fetch(
    `${BASE}/wp-json/wc/v3/customers?email=${encodeURIComponent(email)}`,
    {
      headers: { Authorization: basicAuth() },
      cache: "no-store",
    }
  );

  if (!res.ok) {
    const txt = await res.text();
    console.error("findWooCustomer error:", res.status, txt);
    throw new Error("取得顧客資料失敗");
  }

  const arr = (await res.json().catch(() => [])) as any[];
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[0];
}

function createTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error("SMTP 設定不完整");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "").trim().toLowerCase();
    const next = String(body.next || "/account");

    if (!email || !/.+@.+\..+/.test(email)) {
      return NextResponse.json(
        { ok: false, message: "請輸入正確的 Email" },
        { status: 400 }
      );
    }

    let customer: any = null;
    try {
      customer = await findWooCustomerByEmail(email);
    } catch (e) {
      console.error(e);
      // 即使 Woo 掛了，這裡也不要噴太 detail，避免暴露狀態
    }

    // 無論有沒有找到，都回 ok（防止爆破 email）
    // 但如果沒找到就直接回，不寄信
    if (!customer) {
      return NextResponse.json(
        {
          ok: true,
          message:
            "如果此 Email 有註冊，我們已發送重設密碼連結。請前往信箱查看。",
        },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate",
          },
        }
      );
    }

    // 有找到 → 建立 reset token（預設 30 分鐘）
    const token = jwt.sign(
      {
        type: "reset-password",
        email,
        customerId: customer.id,
      },
      RESET_SECRET,
      { expiresIn: "30m" }
    );

    const url = new URL("/reset-password", SITE_URL);
    url.searchParams.set("token", token);
    url.searchParams.set("next", next);

    const transporter = createTransport();
    const mailFrom = process.env.SMTP_USER!;

    const html = `
      <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6;">
        <h2>重設密碼通知</h2>
        <p>親愛的會員您好：</p>
        <p>我們收到您重設密碼的請求。請點擊下方按鈕前往重設密碼頁面：</p>
        <p style="margin: 24px 0;">
          <a href="${url.toString()}" 
             style="display:inline-block;padding:10px 18px;background:#111;color:#fff;text-decoration:none;border-radius:999px;">
            前往重設密碼
          </a>
        </p>
        <p>如果按鈕無法點擊，請將以下連結複製到瀏覽器開啟：</p>
        <p style="word-break: break-all;">${url.toString()}</p>
        <p>此連結將在 30 分鐘後失效。如非您本人操作，請忽略本信件。</p>
        <p style="margin-top: 24px;">UFLOW 官方網站</p>
      </div>
    `;

    await transporter.sendMail({
      from: mailFrom,
      to: email,
      subject: "UFLOW – 重設密碼連結",
      html,
    });

    return NextResponse.json(
      {
        ok: true,
        message:
          "如果此 Email 有註冊，我們已發送重設密碼連結。請前往信箱查看。",
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (e: any) {
    console.error("forgot-password error:", e);
    return NextResponse.json(
      { ok: false, message: "系統錯誤，請稍後再試。" },
      { status: 500 }
    );
  }
}