import { NextResponse } from "next/server";
import { normalizeRefCode } from "@/lib/affiliate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = (process.env.WC_API_BASE || "").replace(/\/$/, "");
const CK = process.env.WC_CONSUMER_KEY;
const CS = process.env.WC_CONSUMER_SECRET;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = normalizeRefCode(body?.code);
  if (!code || !BASE || !CK || !CS) {
    return NextResponse.json({ ok: false }, { status: 200 });
  }
  try {
    // wc-hover/ 命名空間走 WooCommerce consumer key 驗證（hover-kol-affiliate snippet）
    const res = await fetch(`${BASE}/wp-json/wc-hover/v1/kol-click`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64"),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code }),
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ ok: Boolean(data?.ok) });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
