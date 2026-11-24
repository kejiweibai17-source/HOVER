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
import {
  buildPublicPageMetadata,
  buildPublicPageMetadataFromPath,
  buildWebPageJsonLd,
  getProductCategorySeo,
  getPublicPageSeo,
  getSiteUrl,
} from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";

const SITE_URL = getSiteUrl();

/**
 * 列表內容仍以 ISR 快取資料為主；metadata 依 ?category= 對齊
 * 《HOVER_SEO_OG_設定 0721.xlsx》服飾／帽款／襪子／包袋分類。
 */
export const revalidate = 60;

type ProductsSearchParams = { category?: string | string[] };

function resolveCategorySlug(
  searchParams?: ProductsSearchParams,
): string {
  const raw = searchParams?.category;
  const value = Array.isArray(raw) ? raw[0] : raw;
  return String(value || "")
    .trim()
    .toLowerCase();
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams?: ProductsSearchParams;
}): Promise<Metadata> {
  const categorySeo = getProductCategorySeo(resolveCategorySlug(searchParams));
  if (categorySeo) {
    // Excel：分類頁 OG Title／Description 同 SEO；無需另設 OG 圖
    return buildPublicPageMetadata({
      title: categorySeo.title,
      description: categorySeo.description,
      path: categorySeo.path,
      keywords: categorySeo.keywords,
    });
  }
  return buildPublicPageMetadataFromPath("/products");
}

type ProductsCategoryMeta = Record<
  string,
  { label: string; ids: number[] }
>;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: ProductsSearchParams;
}) {
  const categorySeo =
    getProductCategorySeo(resolveCategorySlug(searchParams)) ||
    getPublicPageSeo("/products");
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
      <JsonLd
        id="json-ld-products-webpage"
        data={buildWebPageJsonLd({
          path: categorySeo.path.startsWith("/products?")
            ? "/products"
            : categorySeo.path,
          title: categorySeo.title,
          description: categorySeo.description,
          siteUrl: SITE_URL,
        })}
      />
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
