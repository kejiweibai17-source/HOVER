import "server-only";

import type { SizeGuide } from "./sizeGuide";
import { extractSizeGuideFromWooProduct } from "./sizeGuide";
import type { WashingInstructions } from "./washingInstructions";
import { extractWashingInstructionsFromWooProduct } from "./washingInstructions";
import type { ProductColor } from "./productColors";
import {
  extractColorSwatchesFromWooProduct,
  extractProductColors,
  extractProductSizes,
} from "./productColors";
import type { ColorGalleries } from "./variationGallery";
import {
  buildColorGalleriesFromVariations,
  extractColorGalleriesFromWooProduct,
  mergeColorGalleries,
} from "./variationGallery";
import type { WooCategoryRaw } from "./categoryNav";
import {
  parseWooVariation,
  type ProductVariation,
} from "./productVariations";

export type WooImage = { id: number; src: string; alt?: string };
export type WooCategoryRef = { id: number; name: string; slug: string };
export type WooProduct = {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  price: string;
  regular_price?: string;
  sale_price?: string;
  images: WooImage[];
  categories: WooCategoryRef[];
  short_description?: string;
  description?: string;
  attributes?: Array<{ name: string; options: string[] }>;
  sizeGuide: SizeGuide;
  washingInstructions: WashingInstructions;
  colorSwatches: Record<string, string>;
  colors: ProductColor[];
  sizes: string[];
  colorGalleries: ColorGalleries;
  variations: ProductVariation[];
};

/** 商品列表頁使用的精簡型別（與 products/Client 相容） */
export type ListProduct = {
  id: number;
  slug: string;
  name: string;
  price: string;
  images: { src: string; alt?: string }[];
  category?: string;
  isNew?: boolean;
  tag?: string;
  colors?: string[];
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
  const attributes = p.attributes || [];
  const colorSwatches = extractColorSwatchesFromWooProduct(p);
  const colors = extractProductColors({ attributes, hover_color_swatches: colorSwatches });
  const sizes = extractProductSizes(attributes);
  const categories: WooCategoryRef[] = Array.isArray(p?.categories)
    ? p.categories.map((c: any) => ({
        id: Number(c.id),
        name: String(c.name || ""),
        slug: String(c.slug || ""),
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
    categories,
    short_description: p.short_description,
    description: p.description,
    attributes,
    sizeGuide: extractSizeGuideFromWooProduct(p),
    washingInstructions: extractWashingInstructionsFromWooProduct(p),
    colorSwatches,
    colors,
    sizes,
    colorGalleries: extractColorGalleriesFromWooProduct(p),
    variations: [],
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

export function mapWooToListProduct(product: WooProduct): ListProduct {
  const primary =
    product.categories[product.categories.length - 1] || product.categories[0];
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price,
    images: product.images.map((image) => ({
      src: image.src,
      alt: image.alt,
    })),
    category: primary?.name || undefined,
    colors: product.colors.map((color) => color.hex).filter(Boolean),
  };
}

function normalizeCategorySlug(slug: string): string {
  try {
    return decodeURIComponent(slug).toLowerCase();
  } catch {
    return slug.toLowerCase();
  }
}

const HIDDEN_PRODUCT_CATEGORY_SLUGS = new Set([
  "uncategorized",
  "未分類",
]);

export function isUncategorizedProduct(product: WooProduct): boolean {
  const categories = product.categories || [];
  if (!categories.length) return true;

  return categories.every((category) => {
    const slug = normalizeCategorySlug(category.slug);
    return (
      HIDDEN_PRODUCT_CATEGORY_SLUGS.has(slug) || category.name === "未分類"
    );
  });
}

/** 排除僅屬於「未分類」的商品，避免出現在列表與分類頁 */
export function filterListableProducts(products: WooProduct[]): WooProduct[] {
  return products.filter((product) => !isUncategorizedProduct(product));
}

/** 依 URL ?category=slug 篩選商品（含子分類） */
export function filterProductsByCategorySlug(
  products: WooProduct[],
  categories: WooCategoryRaw[],
  slug: string,
): WooProduct[] {
  const target = normalizeCategorySlug(slug);
  const matched = categories.find(
    (category) => normalizeCategorySlug(category.slug) === target,
  );

  if (!matched) {
    return products.filter((product) =>
      product.categories.some(
        (category) => normalizeCategorySlug(category.slug) === target,
      ),
    );
  }

  const ids = new Set<number>([matched.id]);
  categories
    .filter((category) => category.parent === matched.id)
    .forEach((category) => ids.add(category.id));

  return products.filter((product) =>
    product.categories.some(
      (category) =>
        ids.has(category.id) ||
        normalizeCategorySlug(category.slug) === target,
    ),
  );
}

async function fetchProductVariations(productId: number) {
  const { base } = getEnv();
  const url = withAuth(
    `${base}/wp-json/wc/v3/products/${productId}/variations?per_page=100&status=publish`,
  );
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return [];
  const data = (await res.json()) as any[];
  return Array.isArray(data) ? data : [];
}

async function attachVariableProductData(
  product: WooProduct,
  raw: any,
): Promise<WooProduct> {
  const fromProduct = extractColorGalleriesFromWooProduct(raw);

  if (raw?.type !== "variable") {
    return { ...product, colorGalleries: fromProduct, variations: [] };
  }

  const variationsRaw = await fetchProductVariations(product.id);
  const fromVariations = buildColorGalleriesFromVariations(variationsRaw);
  const colorGalleries = Object.keys(fromProduct).length
    ? mergeColorGalleries(fromProduct, fromVariations)
    : fromVariations;
  const variations = variationsRaw.map(parseWooVariation);

  return { ...product, colorGalleries, variations };
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
  const product = mapWoo(arr[0]) as WooProduct;
  return attachVariableProductData(product, arr[0]);
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

export type { ProductVariation } from "./productVariations";
export type { WooCategoryRaw } from "./categoryNav";
export { buildCategoryNav, isCategoryVisible } from "./categoryNav";

/** 抓取 WooCommerce 商品分類（含 hover_show_frontend） */
export async function fetchProductCategories() {
  const { base } = getEnv();
  const url = withAuth(
    `${base}/wp-json/wc/v3/products/categories?per_page=100&hide_empty=false`,
  );
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) {
    throw new Error(`取得商品分類失敗 (${res.status})`);
  }
  const data = (await res.json()) as any[];
  return (data || []).map((c) => ({
    id: Number(c.id),
    name: c.name,
    slug: c.slug,
    parent: Number(c.parent ?? 0),
    menu_order:
      c.menu_order === undefined || c.menu_order === null
        ? undefined
        : Number(c.menu_order),
    hover_show_frontend: c.hover_show_frontend,
  }));
}