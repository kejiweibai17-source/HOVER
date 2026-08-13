import { NextResponse } from "next/server";
import {
  searchMockProducts,
  type SearchProductResult,
} from "@/lib/searchProducts";
import { pickWpSizeUrl, toOptimizedImageUrl } from "@/lib/listImageUrl";
import { fetchProductCategories } from "@/lib/woo";

export const dynamic = "force-dynamic";

type WooSearchProduct = {
  id: number;
  name: string;
  slug: string;
  price?: string;
  regular_price?: string;
  images?: Array<{
    src?: string;
    sizes?: Partial<Record<string, string | null>>;
  }>;
};

function wcConfigured(): boolean {
  return Boolean(
    process.env.WC_API_BASE &&
      process.env.WC_CONSUMER_KEY &&
      process.env.WC_CONSUMER_SECRET,
  );
}

function wcUrl(path: string, params: Record<string, string>): URL {
  const base = String(process.env.WC_API_BASE).replace(/\/$/, "");
  const url = new URL(`${base}${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("consumer_key", String(process.env.WC_CONSUMER_KEY));
  url.searchParams.set("consumer_secret", String(process.env.WC_CONSUMER_SECRET));
  return url;
}

function mapSearchProduct(p: WooSearchProduct): SearchProductResult {
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
}

function normalizeKey(value: string): string {
  try {
    return decodeURIComponent(value).trim().toLowerCase();
  } catch {
    return value.trim().toLowerCase();
  }
}

type WooTerm = { id: number; name: string; slug: string; parent?: number };

function termMatchesQuery(term: { name: string; slug: string }, query: string): boolean {
  const q = normalizeKey(query);
  if (!q) return false;
  const slug = normalizeKey(term.slug);
  const name = normalizeKey(term.name);
  if (slug === q || name === q) return true;
  if (q.length < 2) return false;
  return slug.includes(q) || name.includes(q);
}

async function fetchWooProducts(
  params: Record<string, string>,
): Promise<WooSearchProduct[]> {
  const url = wcUrl("/wp-json/wc/v3/products", {
    status: "publish",
    ...params,
  });
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) throw new Error(`Woo products ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function fetchWooTags(): Promise<WooTerm[]> {
  const url = wcUrl("/wp-json/wc/v3/products/tags", {
    per_page: "100",
    hide_empty: "true",
  });
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return [];
  const data = await res.json();
  if (!Array.isArray(data)) return [];
  return data.map((tag) => ({
    id: Number(tag.id),
    name: String(tag.name || ""),
    slug: String(tag.slug || ""),
  }));
}

async function searchWooProducts(
  query: string,
  limit: number,
): Promise<SearchProductResult[] | null> {
  if (!wcConfigured()) return null;

  const perPage = String(Math.max(limit, 20));
  const [nameHits, categories, tags] = await Promise.all([
    fetchWooProducts({
      search: query,
      per_page: String(limit),
      orderby: "date",
      order: "desc",
    }),
    fetchProductCategories().catch(() => []),
    fetchWooTags().catch(() => []),
  ]);

  const matchedCats = categories.filter((cat) => termMatchesQuery(cat, query));
  const categoryIds = new Set(matchedCats.map((cat) => cat.id));
  for (const cat of categories) {
    if (categoryIds.has(cat.parent)) categoryIds.add(cat.id);
  }

  const tagIds = tags
    .filter((tag) => termMatchesQuery(tag, query))
    .map((tag) => tag.id);

  const [categoryHits, tagHits] = await Promise.all([
    categoryIds.size > 0
      ? fetchWooProducts({
          category: Array.from(categoryIds).join(","),
          per_page: perPage,
          orderby: "date",
          order: "desc",
        })
      : Promise.resolve([]),
    tagIds.length > 0
      ? fetchWooProducts({
          tag: tagIds.slice(0, 20).join(","),
          per_page: perPage,
          orderby: "date",
          order: "desc",
        })
      : Promise.resolve([]),
  ]);

  const seen = new Set<number>();
  const merged: SearchProductResult[] = [];
  for (const product of [...tagHits, ...categoryHits, ...nameHits]) {
    const id = Number(product?.id);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    merged.push(mapSearchProduct(product));
    if (merged.length >= limit) break;
  }

  return merged;
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
    if (wooResults !== null) {
      return NextResponse.json({
        ok: true,
        results: wooResults,
        source: "woocommerce",
      });
    }
  } catch (error) {
    console.error("[api/search]", error);
    if (wcConfigured()) {
      return NextResponse.json({
        ok: false,
        results: [],
        source: "woocommerce",
        message: "搜尋失敗",
      });
    }
  }

  return NextResponse.json({
    ok: true,
    results: searchMockProducts(q, limit),
    source: "mock",
  });
}
