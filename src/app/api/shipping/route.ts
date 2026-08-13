import { NextResponse } from "next/server";
import {
  DEFAULT_SHIPPING,
  fetchShippingSettings,
} from "@/lib/shippingDefaults";

export const revalidate = 60;

export async function GET() {
  try {
    const shipping = await fetchShippingSettings();
    return NextResponse.json({
      ok: true,
      shipping,
      fallback: false,
    });
  } catch (error) {
    console.error("[api/shipping]", error);
    return NextResponse.json({
      ok: false,
      shipping: DEFAULT_SHIPPING,
      fallback: true,
      message: "無法載入運費設定",
    });
  }
}
