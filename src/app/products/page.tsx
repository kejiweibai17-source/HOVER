// app/products/page.tsx
import Client from "./Client";
import Script from "next/script";
import type { Metadata } from "next";
import { MOCK_PRODUCTS } from "@/lib/mockProducts";
import {
  fetchAllProducts,
  fetchProductCategories,
  filterListableProducts,
  filterProductsByCategorySlug,
  mapWooToListProduct,
} from "@/lib/woo";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const CATEGORY_SEO: Record<string, { title: string; description: string }> = {
  tops: {
    title: "服飾｜HOVER",
    description:
      "探索 HOVER 服飾系列，以中性設計、舒適剪裁與簡約質感，打造自在融入生活的日常穿著。",
  },
  headwear: {
    title: "帽款｜HOVER",
    description:
      "探索 HOVER 帽款系列，以簡約設計與舒適版型，打造適合日常穿搭的經典帽款。",
  },
  socks: {
    title: "襪子｜HOVER",
    description:
      "探索 HOVER 襪子系列，以舒適著感與簡約設計，為日常穿搭增添細節與質感。",
  },
  bags: {
    title: "包袋｜HOVER",
    description:
      "探索 HOVER 包袋系列，以簡約設計與實用機能，陪伴每個日常。",
  },
};

export const revalidate = 60;

type PageProps = {
  searchParams: Promise<{ category?: string }>;
};

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const { category } = await searchParams;
  const slug = category ? decodeURIComponent(category).toLowerCase() : "";
  const seo = CATEGORY_SEO[slug] || {
    title: "所有商品｜HOVER",
    description:
      "探索 HOVER 全系列服飾、帽款、襪子與包袋，以舒適剪裁與簡約質感，陪伴每個日常。",
  };
  const canonical = slug
    ? `/products?category=${encodeURIComponent(slug)}`
    : "/products";

  return {
    metadataBase: new URL(SITE_URL),
    title: seo.title,
    description: seo.description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "zh_TW",
      url: canonical,
      siteName: "HOVER",
      title: seo.title,
      description: seo.description,
    },
    twitter: {
      card: "summary",
      title: seo.title,
      description: seo.description,
    },
    robots: { index: true, follow: true },
  };
}

export default async function ProductsPage({ searchParams }: PageProps) {
  const { category: categorySlug } = await searchParams;

  let items = MOCK_PRODUCTS;
  let categoryLabel = "ALL ITEMS";

  try {
    const [wooProducts, categories] = await Promise.all([
      fetchAllProducts(),
      fetchProductCategories(),
    ]);

    const listableProducts = filterListableProducts(wooProducts);

    const filtered = categorySlug
      ? filterProductsByCategorySlug(listableProducts, categories, categorySlug)
      : listableProducts;

    items = filtered.map(mapWooToListProduct);

    if (categorySlug) {
      const matched = categories.find(
        (category) =>
          category.slug.toLowerCase() ===
          decodeURIComponent(categorySlug).toLowerCase(),
      );
      categoryLabel = matched?.name || categorySlug.toUpperCase();
    }

    console.log(
      "🌐 [商品列表] WooCommerce 商品數:",
      wooProducts.length,
      categorySlug ? `篩選 ${categorySlug}: ${filtered.length}` : "",
    );
  } catch (error) {
    console.error("❌ 商品列表抓取失敗，使用 mock 資料:", error);
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((product, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}/products/${product.slug}`,
      name: product.name,
      image: product.images?.[0]?.src || "",
      offers: {
        "@type": "Offer",
        priceCurrency: "TWD",
        price: product.price,
      },
    })),
  };

  return (
    <>
      {/* 注入結構化資料 */}
      <Script
        id="json-ld-products"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 渲染 Client Component */}
      <Client items={items} categoryLabel={categoryLabel} />
    </>
  );
}
