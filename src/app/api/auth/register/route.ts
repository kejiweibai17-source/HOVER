// app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

const BASE = process.env.WC_API_BASE;
const CK = process.env.WC_CONSUMER_KEY;
const CS = process.env.WC_CONSUMER_SECRET;
const RESET_SECRET = process.env.RESET_TOKEN_SECRET!;

// 🚀 智慧網址判斷機制 (防呆 + 自動抓取正式環境)
const getBaseUrl = () => {
  let url = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  
  // 防呆：自動修復 .env 中可能手滑打錯的 hhttp
  if (url.startsWith("hhttp")) {
    url = url.replace("hhttp", "http");
  }
  
  // 如果在 Vercel 且沒有設定 NEXT_PUBLIC_SITE_URL，自動吃 Vercel 提供的正式網址
  if (process.env.VERCEL_URL && !process.env.NEXT_PUBLIC_SITE_URL) {
    url = `https://${process.env.VERCEL_URL}`;
  }
  
  // 確保結尾沒有斜線
  return url.replace(/\/$/, "");
};

const SITE_URL = getBaseUrl();

function basicAuth() {
  if (!CK || !CS) throw new Error("缺少 WooCommerce consumer key/secret");
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
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

/* =========================
   ✅ referral helpers
========================= */

// 解析 refCode (UF{id})
function parseAmbassadorId(ref?: string | null): number | null {
  if (!ref) return null;
  const s = String(ref).trim();
  if (!s.startsWith("UF")) return null;
  const n = Number(s.replace("UF", ""));
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

// 確認大使是否存在
async function ensureAmbassadorExists(id: number): Promise<boolean> {
  try {
    const r = await fetch(`${BASE}/wp-json/wc/v3/customers/${id}`, {
      headers: { Authorization: basicAuth() },
      cache: "no-store",
    });
    return r.ok;
  } catch {
    return false;
  }
}

// 給親友 50 元註冊禮（一次）
async function grantFriendCoupon(newCustomerId: number, ambassadorId: number) {
  const authHeader = { Authorization: basicAuth() };

  const uRes = await fetch(`${BASE}/wp-json/wc/v3/customers/${newCustomerId}`, {
    headers: authHeader,
    cache: "no-store",
  });
  const user = await uRes.json();
  const meta: any[] = Array.isArray(user.meta_data) ? user.meta_data : [];

  const already = meta.find(
    (m) => m.key === "uf_ref_signup_rewarded" && String(m.value) === "1"
  );
  if (already) return;

  const code = `UFFRD-${newCustomerId}`;
  const expires = new Date();
  expires.setMonth(expires.getMonth() + 2);

  await fetch(`${BASE}/wp-json/wc/v3/coupons`, {
    method: "POST",
    headers: { ...authHeader, "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      discount_type: "fixed_cart",
      amount: "50",
      individual_use: true,
      usage_limit: 1,
      usage_limit_per_user: 1,
      email_restrictions: [user.email],
      date_expires: expires.toISOString(),
      description: "好友推薦註冊禮 50 元",
      meta_data: [
        { key: "uf_ref_friend_coupon", value: "1" },
        { key: "uf_referred_by", value: String(ambassadorId) },
      ],
    }),
  });

  await fetch(`${BASE}/wp-json/wc/v3/customers/${newCustomerId}`, {
    method: "PUT",
    headers: { ...authHeader, "Content-Type": "application/json" },
    body: JSON.stringify({
      meta_data: [{ key: "uf_ref_signup_rewarded", value: "1" }],
    }),
  });
}

export async function POST(req: Request) {
  try {
    if (!BASE) {
      return NextResponse.json(
        { message: "未設定 WC_API_BASE 環境變數" },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email: string = String(body.email || "").trim().toLowerCase();
    const username: string = String(body.username || "").trim();
    const password: string = String(body.password || "");
    const ref: string | null = body.ref ? String(body.ref) : null;

    if (!email || !password) {
      return NextResponse.json(
        { message: "缺少 email 或 password" },
        { status: 400 }
      );
    }

    /* =========================
       ✅ referral: parse + verify
    ========================= */
    const ambassadorId = parseAmbassadorId(ref);
    const ambassadorOk =
      ambassadorId ? await ensureAmbassadorExists(ambassadorId) : false;

    // 1) 建立 WooCommerce customer，預設 email 未驗證
    const meta_data: any[] = [{ key: "email_verified", value: "0" }];

    // referral: 若 ref 合法，先寫 uf_referred_by
    if (ambassadorOk && ambassadorId) {
      meta_data.push({
        key: "uf_referred_by",
        value: String(ambassadorId),
      });
    }

    const res = await fetch(`${BASE}/wp-json/wc/v3/customers`, {
      method: "POST",
      headers: {
        Authorization: basicAuth(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        username: username || email,
        password,
        meta_data,
      }),
      cache: "no-store",
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { message: data?.message || "WooCommerce 建立帳號失敗" },
        { status: res.status }
      );
    }

    const newCustomerId: number = data.id;
    const createdEmail = String(data?.email || email).trim().toLowerCase();

    // 給推薦禮
    if (ambassadorOk && ambassadorId && ambassadorId !== newCustomerId) {
      try {
        await grantFriendCoupon(newCustomerId, ambassadorId);
      } catch (e) {
        console.error("grantFriendCoupon error:", e);
      }
    }

    // 2) 產生驗證 token（🚀 更改為 15 分鐘過期）
    const token = jwt.sign(
      {
        type: "verify-email",
        email: createdEmail,
        customerId: newCustomerId,
      },
      RESET_SECRET,
      { expiresIn: "15m" }
    );

    const url = new URL("/verify-email", SITE_URL);
    url.searchParams.set("token", token);

    // 3) 寄出驗證信（加上美化樣式與 LINE 連結）
    try {
      const transporter = createTransport();
      await transporter.verify();

      const mailFrom = process.env.SMTP_USER!;
      
      // 🚀 優化信件排版 HTML
      const html = `
        <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
          <h2 style="color: #222; border-bottom: 2px solid #f58a9c; padding-bottom: 10px;">會員註冊信箱驗證</h2>
          <p>親愛的會員您好：</p>
          <p>感謝您註冊 HOVER，請點擊下方按鈕完成信箱驗證：</p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${url.toString()}" target="_blank"
               style="display: inline-block; padding: 14px 28px; background-color: #f58a9c; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; letter-spacing: 1px;">
              完成信箱驗證
            </a>
          </div>

          <p style="font-size: 14px; color: #666; margin-bottom: 8px;">如果按鈕無法點擊，請將以下連結複製並貼上到瀏覽器網址列開啟：</p>
          <div style="background-color: #f8f9fa; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 13px; color: #0056b3;">
            ${url.toString()}
          </div>
          
          <p style="color: #e63946; font-weight: bold; margin-top: 20px;">⚠️ 此驗證連結將在 15 分鐘後失效。</p>

          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0;" />

          <p style="font-size: 14px; color: #666;">若您在驗證過程中遇到任何問題，或需要協助，歡迎隨時透過 LINE 官方客服與我們聯繫：</p>
          <div style="margin-top: 15px;">
            <a href="https://lin.ee/uKRvV64" target="_blank"
               style="display: inline-block; padding: 10px 20px; background-color: #00B900; color: #ffffff; text-decoration: none; border-radius: 4px; font-weight: bold; font-size: 14px;">
              💬 聯繫 LINE 客服
            </a>
          </div>
          
          <div style="margin-top: 40px; font-size: 12px; color: #999; text-align: center;">
            <p>HOVER 威爾特 | 官方網站</p>
          </div>
        </div>
      `;

      const info = await transporter.sendMail({
        from: `"HOVER 威爾特" <${mailFrom}>`,
        to: createdEmail,
        subject: "HOVER – 會員信箱驗證",
        html,
      });

      console.log("[verify-email] sent:", info.messageId, info.response);
    } catch (e) {
      console.error("send verify email error:", e);
      return NextResponse.json(
        { ok: false, message: "驗證信寄送失敗，請稍後重試或聯絡客服。" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        user: data,
        message: "註冊成功，請前往信箱完成驗證。",
        referralApplied: ambassadorOk ? true : false,
      },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } }
    );
  } catch (err: any) {
    console.error("register error:", err);
    return NextResponse.json(
      { ok: false, message: err?.message || "伺服器錯誤" },
      { status: 500 }
    );
  }
}