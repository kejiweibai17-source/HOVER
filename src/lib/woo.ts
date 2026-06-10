import "server-only";

export type WooImage = { id: number; src: string; alt?: string };
export type WooProduct = {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  price: string;
  regular_price?: string;
  sale_price?: string;
  images: WooImage[];
  short_description?: string;
  description?: string;
  attributes?: Array<{ name: string; options: string[] }>;
};

const getEnv = () => {
  const base = process.env.WC_API_BASE || "";
  const key = process.env.WC_CONSUMER_KEY || "";
  const secret = process.env.WC_CONSUMER_SECRET || "";
  if (!base || !key || !secret) {
    throw new Error(
      "WooCommerce 環境變數缺失：請在 .env.local 設定 WC_API_BASE/KEY/SECRET"
    );
  }
  return { base, key, secret };
};

const withAuth = (url: string) => {
  const { key, secret } = getEnv();
  const u = new URL(url);
  u.searchParams.set("consumer_key", key);
  u.searchParams.set("consumer_secret", secret);
  return u.toString();
};

const mapWoo = (p: any): WooProduct => {
  const images: WooImage[] = Array.isArray(p?.images)
    ? p.images.map((im: any) => ({
        id: im.id,
        src: im.src,
        alt: im.alt || p?.name || "",
      }))
    : [];
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    permalink: p.permalink,
    price: p.price || p.regular_price || "0",
    regular_price: p.regular_price,
    sale_price: p.sale_price,
    images,
    short_description: p.short_description,
    description: p.description,
    attributes: p.attributes || [],
  } as WooProduct;
};

// 1. 基礎列表抓取 (支援分頁)
export async function fetchProducts({
  page = 1,
  perPage = 24,
}: { page?: number; perPage?: number } = {}) {
  const { base } = getEnv();
  const url = withAuth(
    `${base}/wp-json/wc/v3/products?page=${page}&per_page=${perPage}&status=publish`
  );
  
  // 使用 no-store 或 revalidate 確保資料新鮮度，這裡沿用原本的 revalidate: 60
  const res = await fetch(url, { next: { revalidate: 60 } });
  
  if (!res.ok) throw new Error("取得商品列表失敗");
  const data = await res.json();
  return (data as any[]).map(mapWoo) as WooProduct[];
}

// 2. [新增] 抓取所有產品 (用於列表頁)
// 這裡預設抓取 100 筆，直接複用 fetchProducts 的邏輯
export async function fetchAllProducts() {
  return fetchProducts({ page: 1, perPage: 100 });
}

// 3. 單一產品抓取 (透過 Slug)
export async function fetchProductBySlug(slug: string) {
  const { base } = getEnv();
  const url = withAuth(
    `${base}/wp-json/wc/v3/products?slug=${encodeURIComponent(
      slug
    )}&status=publish`
  );
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return null;
  const arr = (await res.json()) as any[];
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return mapWoo(arr[0]) as WooProduct;
}

// 4. 抓取所有 Slugs (用於 generateStaticParams)
export async function fetchAllProductSlugs({
  perPage = 100,
}: { perPage?: number } = {}) {
  const { base } = getEnv();
  const url = withAuth(
    `${base}/wp-json/wc/v3/products?per_page=${perPage}&status=publish`
  );
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return [] as string[];
  const data = (await res.json()) as any[];
  return (data || []).map((p: any) => p.slug as string).filter(Boolean);
}