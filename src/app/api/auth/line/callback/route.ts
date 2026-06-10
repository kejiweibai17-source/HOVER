// app/api/auth/line/callback/route.ts
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export const runtime = "nodejs";

// 環境變數
const BASE = process.env.WC_API_BASE;
const CK = process.env.WC_CONSUMER_KEY;
const CS = process.env.WC_CONSUMER_SECRET;
const JWT_SECRET = process.env.RESET_TOKEN_SECRET!; // 登入用的 JWT Secret
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

// WooCommerce 驗證
function basicAuth() {
    return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const error = searchParams.get("error");

    // 1. 如果使用者取消授權或發生錯誤，導回登入頁
    if (error || !code) {
        return NextResponse.redirect(`${SITE_URL}/login?error=line_login_failed`);
    }

    try {
        // 2. 用 code 向 LINE 換取 access_token 和 id_token
        const tokenParams = new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: process.env.LINE_CALLBACK_URL!,
            client_id: process.env.LINE_CHANNEL_ID!,
            client_secret: process.env.LINE_CHANNEL_SECRET!,
        });

        const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: tokenParams,
        });

        const tokenData = await tokenRes.json();

        if (!tokenData.id_token) {
            console.error("LINE Token Error:", tokenData);
            throw new Error("No id_token from LINE");
        }

        // 3. 解析 id_token (JWT) 取得使用者個資
        // LINE 的 id_token 包含: name, picture, email
        const idTokenPayload = JSON.parse(
            Buffer.from(tokenData.id_token.split(".")[1], "base64").toString()
        );

        const email = idTokenPayload.email;
        const name = idTokenPayload.name;
        const lineUserId = idTokenPayload.sub;
        const picture = idTokenPayload.picture;

        if (!email) {
            return NextResponse.redirect(`${SITE_URL}/login?error=no_email_permission`);
        }

        // 4. 檢查 WooCommerce 是否已有此 Email
        const searchRes = await fetch(`${BASE}/wp-json/wc/v3/customers?email=${email}`, {
            headers: { Authorization: basicAuth() },
        });
        const searchData = await searchRes.json();

        let user;

        if (searchData.length > 0) {
            // 情況 A: 使用者已存在 -> 直接登入
            user = searchData[0];

            // (選擇性) 可以在這裡更新使用者的 meta_data 紀錄 LINE ID
        } else {
            // 情況 B: 新使用者 -> 註冊
            // 隨機生成一組密碼，因為是用 LINE 登入，使用者不需要知道密碼
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);

            const createRes = await fetch(`${BASE}/wp-json/wc/v3/customers`, {
                method: "POST",
                headers: {
                    Authorization: basicAuth(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email: email,
                    username: email, // 用 email 當帳號
                    first_name: name,
                    password: randomPassword,
                    meta_data: [
                        { key: "email_verified", value: "1" }, // LINE 驗證過的 email 視為已驗證
                        { key: "social_login_line_id", value: lineUserId },
                        { key: "avatar_url", value: picture || "" }
                    ],
                }),
            });

            if (!createRes.ok) {
                console.error("WC Create Error", await createRes.json());
                throw new Error("Failed to create user");
            }
            user = await createRes.json();
        }

        // 5. 製作登入 Session Token (JWT)
        const sessionToken = jwt.sign(
            {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.first_name || user.username
            },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        // 6. 設定 Cookie 並導回首頁
        // 這裡我們把 Token 寫入 Cookie，讓前端可以讀取
        const response = NextResponse.redirect(`${SITE_URL}/`);

        response.cookies.set("auth_token", sessionToken, {
            httpOnly: false, // 設為 false 方便前端 JS 讀取 (如果你是用 document.cookie 讀取)
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: 60 * 60 * 24 * 7, // 7天
        });

        return response;

    } catch (err) {
        console.error("LINE Callback Error:", err);
        return NextResponse.redirect(`${SITE_URL}/login?error=server_error`);
    }
}