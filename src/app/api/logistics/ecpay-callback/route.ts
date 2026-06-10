import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const formData = await req.formData();

        const storeId = formData.get("CVSStoreID")?.toString();
        const storeName = formData.get("CVSStoreName")?.toString();
        const storeAddr = formData.get("CVSAddress")?.toString();
        const logisticsSubType = formData.get("LogisticsSubType")?.toString() || "";

        const origin = new URL(req.url).origin;

        // 使用 URLSearchParams 確保中文正確編碼
        const params = new URLSearchParams();
        params.set("step", "2");
        if (storeId) params.set("storeId", storeId);
        if (storeName) params.set("storeName", storeName);
        if (storeAddr) params.set("storeAddr", storeAddr);

        // 判斷物流商
        if (logisticsSubType.includes("UNIMART")) {
            params.set("provider", "711");
        } else {
            params.set("provider", "ecpay_cvs");
        }

        const redirectUrl = `${origin}/cart?${params.toString()}`;
        return NextResponse.redirect(redirectUrl, 303);

    } catch (error) {
        console.error("❌ ECPay Callback Error:", error);
        return NextResponse.redirect(new URL("/cart?error=callback_failed", req.url));
    }
}