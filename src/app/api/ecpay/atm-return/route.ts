import { NextResponse } from "next/server";
import {
  saveEcpayPaymentInfo,
  verifyEcpayMac,
} from "@/lib/ecpayPaymentInfo";

export const runtime = "nodejs";

function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ).replace(/\/$/, "");
}

async function parseBody(req: Request): Promise<Record<string, string>> {
  const formData = await req.formData();
  const data: Record<string, string> = {};
  formData.forEach((value, key) => {
    data[key] = String(value ?? "");
  });
  return data;
}

export async function POST(req: Request) {
  try {
    const data = await parseBody(req);
    const orderId = data.CustomField1 || "";

    if (verifyEcpayMac(data) && data.RtnCode === "2") {
      await saveEcpayPaymentInfo(data);
    } else {
      console.error("ATM ClientRedirect 驗證失敗或非取號成功", data.RtnCode);
    }

    return NextResponse.redirect(
      `${siteUrl()}/thank-you?orderId=${encodeURIComponent(orderId)}`,
      303,
    );
  } catch (error) {
    console.error("ATM ClientRedirect 錯誤:", error);
    return NextResponse.redirect(`${siteUrl()}/thank-you`, 303);
  }
}
