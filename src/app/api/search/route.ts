import { NextResponse } from "next/server";
import {
  searchMockProducts,
  type SearchProductResult,
} from "@/lib/searchProducts";
import { pickWpSizeUrl, toOptimizedImageUrl } from "@/lib/listImageUrl";

export const dynamic = "force-dynamic";

async function searchWooProducts(
  query: string,
  limit: number,
): Promise<SearchProductResult[] | null> {
  const base = process.env.WC_API_BASE;
  const key = process.env.WC_CONSUMER_KEY;
  const secret = process.env.WC_CONSUMER_SECRET;
  if (!base || !key || !secret) return null;

  const url = new URL(`${base}/wp-json/wc/v3/products`);
  url.searchParams.set("search", query);
  url.searchParams.set("per_page", String(limit));
  url.searchParams.set("status", "publish");
  url.searchParams.set("consumer_key", key);
  url.searchParams.set("consumer_secret", secret);

  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return null;

  const data = (await res.json()) as Array<{
    id: number;
    name: string;
    slug: string;
    price?: string;
    regular_price?: string;
    images?: Array<{
      src?: string;
      sizes?: Partial<Record<string, string | null>>;
    }>;
  }>;

  if (!Array.isArray(data) || data.length === 0) return [];

  return data.map((p) => {
    const img = p.images?.[0];
    const src = img?.src || "";
    const image = src
      ? pickWpSizeUrl(img?.sizes, "card", "") ||
        toOptimizedImageUrl(src, "card") ||
        src
      : undefined;
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: p.price || p.regular_price || "0",
      image,
    };
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";
  const limit = Math.min(
    20,
    Math.max(1, Number(searchParams.get("limit") || 10)),
  );

  if (!q) {
    return NextResponse.json({ ok: true, results: [], source: "none" });
  }

  try {
    const wooResults = await searchWooProducts(q, limit);
    if (wooResults !== null && wooResults.length > 0) {
      return NextResponse.json({
        ok: true,
        results: wooResults,
        source: "woocommerce",
      });
    }
  } catch {
    // fall through to mock data
  }

  const mockResults = searchMockProducts(q, limit);
  return NextResponse.json({
    ok: true,
    results: mockResults,
    source: "mock",
  });
}
