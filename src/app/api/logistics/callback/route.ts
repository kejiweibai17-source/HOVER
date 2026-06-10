import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    
    // 綠界回傳的欄位名稱
    const storeName = formData.get("CVSStoreName"); // 門市名稱
    const storeId = formData.get("CVSStoreID");     // 門市店號
    const storeAddr = formData.get("CVSAddress");   // 門市地址

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const redirectUrl = new URL("/cart", baseUrl);
    
    redirectUrl.searchParams.set("step", "2");
    redirectUrl.searchParams.set("storeName", storeName as string);
    redirectUrl.searchParams.set("storeId", storeId as string);
    redirectUrl.searchParams.set("storeAddr", storeAddr as string);
    redirectUrl.searchParams.set("shipMethod", "UNIMART"); 

    // 務必使用 303 Redirect
    return NextResponse.redirect(redirectUrl.toString(), 303);
  } catch (error) {
    console.error("7-11 Callback Error:", error);
    return NextResponse.json({ error: "7-11 Map callback failed" }, { status: 500 });
  }
}