// app/api/logistics/ezship-callback/route.ts
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    // ezShip 回傳欄位
    const storeName = formData.get("stName");
    const storeId = formData.get("stCode");
    const storeAddr = formData.get("stAddr");

    // 設定回傳網址 (使用 env 或 fallback)
    // 注意：如果您的網站有 HTTPS，建議用 process.env.NEXT_PUBLIC_BASE_URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const redirectUrl = new URL("/cart", baseUrl);

    // ✅ 統一參數名稱 (跟前端 useEffect 對接)
    redirectUrl.searchParams.set("step", "2");
    redirectUrl.searchParams.set("storeName", storeName as string);
    redirectUrl.searchParams.set("storeId", storeId as string);
    redirectUrl.searchParams.set("storeAddr", storeAddr as string);

    // ✅ 關鍵修改：加入 provider 參數
    // 這樣前端就知道這是 "ezShip" 回來的，會保持在 "全家/萊爾富/OK" 的按鈕狀態
    redirectUrl.searchParams.set("provider", "ezship");

    return NextResponse.redirect(redirectUrl.toString(), 302);
  } catch (error) {
    console.error("ezShip Callback Error:", error);
    return NextResponse.redirect(new URL("/cart?error=ezship_failed", req.url));
  }
}