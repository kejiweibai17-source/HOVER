// app/products/page.tsx
import { Suspense } from "react";
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
  type WooCategoryRaw,
  type ListProduct,
} from "@/lib/woo";
import { fetchCategoryBannerSettings } from "@/lib/categoryBannerDefaults";
import { buildProductFilterOptions } from "@/lib/productFilters";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * 不在 Server 讀 searchParams（否則整頁變 dynamic、無法 ISR）。
 * 分類篩選改由 Client 用 useSearchParams 處理。
 */
export const revalidate = 300;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "所有商品｜HOVER",
  description:
    "探索 HOVER 全系列服飾、帽款、襪子與包袋，以舒適剪裁與簡約質感，陪伴每個日常。",
  alternates: { canonical: "/products" },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: "/products",
    siteName: "HOVER",
    title: "所有商品｜HOVER",
    description:
      "探索 HOVER 全系列服飾、帽款、襪子與包袋，以舒適剪裁與簡約質感，陪伴每個日常。",
  },
  twitter: {
    card: "summary",
    title: "所有商品｜HOVER",
    description:
      "探索 HOVER 全系列服飾、帽款、襪子與包袋，以舒適剪裁與簡約質感，陪伴每個日常。",
  },
};

type ProductsCategoryMeta = Record<
  string,
  { label: string; ids: number[] }
>;

export default async function ProductsPage() {
  let items: ListProduct[] = MOCK_PRODUCTS;
  let filterCategories: WooCategoryRaw[] = [];
  let categoryMeta: ProductsCategoryMeta = {
    all: { label: "ALL ITEMS", ids: MOCK_PRODUCTS.map((p) => p.id) },
  };

  const [bannerSettings, productResult] = await Promise.all([
    fetchCategoryBannerSettings(),
    (async () => {
      try {
        const [wooProducts, categories] = await Promise.all([
          fetchAllProducts(),
          fetchProductCategories(),
        ]);

        const listableProducts = filterListableProducts(wooProducts);
        const mapped = listableProducts.map(mapWooToListProduct);
        const meta: ProductsCategoryMeta = {
          all: {
            label: "ALL ITEMS",
            ids: mapped.map((p) => p.id),
          },
        };

        for (const category of categories) {
          const slug = String(category.slug || "")
            .trim()
            .toLowerCase();
          if (!slug || meta[slug]) continue;
          const filtered = filterProductsByCategorySlug(
            listableProducts,
            categories,
            slug,
          );
          meta[slug] = {
            label: category.name || slug.toUpperCase(),
            ids: filtered.map((p) => p.id),
          };
        }

        console.log("🌐 [商品列表] WooCommerce 商品數:", wooProducts.length);

        return {
          items: mapped,
          categories,
          categoryMeta: meta,
        };
      } catch (error) {
        console.error("❌ 商品列表抓取失敗，使用 mock 資料:", error);
        return {
          items: MOCK_PRODUCTS,
          categories: [] as WooCategoryRaw[],
          categoryMeta: {
            all: {
              label: "ALL ITEMS",
              ids: MOCK_PRODUCTS.map((p) => p.id),
            },
          } as ProductsCategoryMeta,
        };
      }
    })(),
  ]);

  items = productResult.items;
  filterCategories = productResult.categories;
  categoryMeta = productResult.categoryMeta;

  const filterOptions = buildProductFilterOptions(filterCategories, items);

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
      <Script
        id="json-ld-products"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Suspense
        fallback={
          <div className="min-h-[60vh] bg-white" aria-hidden="true" />
        }
      >
        <Client
          items={items}
          categoryMeta={categoryMeta}
          bannerSettings={bannerSettings}
          filterOptions={filterOptions}
        />
      </Suspense>
    </>
  );
}
