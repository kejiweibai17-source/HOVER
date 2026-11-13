import { NextResponse } from "next/server";
import { pickWpSizeUrl, toOptimizedImageUrl } from "@/lib/listImageUrl";
import { normalizeStorefrontSlug } from "@/lib/productColors";
import { resolveWooPrices } from "@/lib/productPricing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BASE = process.env.WC_API_BASE || "";
const CK = process.env.WC_CONSUMER_KEY || "";
const CS = process.env.WC_CONSUMER_SECRET || "";

function authHeader() {
  if (!CK || !CS) return "";
  return "Basic " + Buffer.from(`${CK}:${CS}`).toString("base64");
}

function toImageSrc(product: any): string {
  const images = Array.isArray(product?.images) ? product.images : [];
  const first = images[0];
  if (!first) return "";
  const raw =
    pickWpSizeUrl(first?.sizes, "card", "") ||
    String(first?.src || "").trim();
  if (!raw) return "";
  return toOptimizedImageUrl(raw, "card");
}

/**
 * 依收藏的商品 ID 回補最新 slug／圖片／售價。
 * 解決：localStorage 缺圖、舊 slug、QuickView 誤存數字 ID 當 slug。
 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawIds = Array.isArray(body?.ids) ? body.ids : [];
    const ids = [
      ...new Set(
        rawIds
          .map((id: unknown) => Number(id))
          .filter((id: number) => Number.isFinite(id) && id > 0),
      ),
    ].slice(0, 60);

    if (!ids.length) {
      return NextResponse.json({ ok: true, items: [] });
    }
    if (!BASE || !CK || !CS) {
      return NextResponse.json(
        { ok: false, message: "Woo 環境變數未設定" },
        { status: 500 },
      );
    }

    const url = new URL(`${BASE.replace(/\/$/, "")}/wp-json/wc/v3/products`);
    url.searchParams.set("include", ids.join(","));
    url.searchParams.set("per_page", String(ids.length));
    url.searchParams.set("status", "publish");

    const res = await fetch(url.toString(), {
      headers: { Authorization: authHeader() },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, message: `Woo 讀取失敗 (${res.status})` },
        { status: 502 },
      );
    }

    const products = (await res.json()) as any[];
    const byId = new Map<number, any>();
    for (const product of Array.isArray(products) ? products : []) {
      const id = Number(product?.id);
      if (id > 0) byId.set(id, product);
    }

    const items = ids.map((id) => {
      const product = byId.get(id);
      if (!product) {
        return { id, missing: true as const };
      }
      const prices = resolveWooPrices(product);
      const slug = normalizeStorefrontSlug(String(product.slug || "").trim());
      return {
        id,
        missing: false as const,
        slug,
        name: String(product.name || "").trim(),
        price: String(prices.price || product.price || "0"),
        image: toImageSrc(product),
      };
    });

    return NextResponse.json({ ok: true, items });
  } catch (error) {
    console.error("[wishlist/hydrate]", error);
    return NextResponse.json(
      { ok: false, message: "收藏資料同步失敗" },
      { status: 500 },
    );
  }
}
