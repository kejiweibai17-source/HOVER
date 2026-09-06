import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 已停用：不可再透過第三方直接建立新會員。
 * 新會員請先走 /register 基本註冊，再以社群登入綁定既有帳號。
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message:
        "請先完成基本會員註冊（姓名、手機、Email、密碼），再以社群登入綁定既有帳號。",
      code: "SOCIAL_CREATE_DISABLED",
    },
    { status: 403 },
  );
}
