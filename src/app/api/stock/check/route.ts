import { NextResponse } from "next/server";
import { checkCartStock } from "@/lib/validateCartStock";

export const runtime = "nodejs";

const BASE = process.env.WC_API_BASE || "";
const CK = process.env.WC_CONSUMER_KEY || "";
const CS = process.env.WC_CONSUMER_SECRET || "";

function basicAuth(): string | undefined {
  if (!CK || !CS) return undefined;
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

export async function POST(req: Request) {
  try {
    const auth = basicAuth();
    if (!auth || !BASE) {
      return NextResponse.json(
        { ok: false, message: "WooCommerce 未設定" },
        { status: 500 },
      );
    }

    const body = await req.json();
    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) {
      return NextResponse.json({ ok: true, results: [] });
    }

    const checked = await checkCartStock(BASE, auth, items);
    return NextResponse.json({
      ok: checked.ok,
      message: checked.message,
      results: checked.results.map((r) => ({
        productId: r.productId,
        variationId: r.variationId,
        maxQty: r.maxQty,
        manageStock: r.stock.manageStock,
        stockQuantity: r.stock.stockQuantity,
        stockStatus: r.stock.stockStatus,
        backorders: r.stock.backorders,
        requestedQty: r.requestedQty,
        lineOk: r.ok,
      })),
    });
  } catch (e) {
    console.error("[stock/check]", e);
    return NextResponse.json(
      { ok: false, message: "庫存查詢失敗" },
      { status: 500 },
    );
  }
}
