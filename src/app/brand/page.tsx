import { Metadata } from "next";
import { fetchBrandPage, encodeBrandImageUrl } from "@/lib/brandPageDefaults";
import {
  buildPublicPageMetadata,
  buildWebPageJsonLd,
  getPublicPageSeo,
} from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";
import BrandStoryView from "./client";

export const revalidate = 300;

const BRAND_FALLBACK = getPublicPageSeo("/brand");

export async function generateMetadata(): Promise<Metadata> {
  const page = await fetchBrandPage();
  return buildPublicPageMetadata({
    title: page.seoTitle || BRAND_FALLBACK.title,
    // 有後台設定用後台；否則鎖 catalog，與首頁 sitelink 一致
    description: page.seoDescription || BRAND_FALLBACK.description,
    path: "/brand",
    image: page.imageDesktop.url
      ? encodeBrandImageUrl(page.imageDesktop.url)
      : "/images/hover/hero.jpg",
    keywords: BRAND_FALLBACK.keywords,
  });
}

export default async function BrandPage() {
  const page = await fetchBrandPage();
  const description = page.seoDescription || BRAND_FALLBACK.description;
  const title = page.seoTitle || BRAND_FALLBACK.title;

  return (
    <>
      <JsonLd
        id="json-ld-brand-webpage"
        data={buildWebPageJsonLd({
          path: "/brand",
          title,
          description,
        })}
      />
      <BrandStoryView page={page} />
    </>
  );
}
