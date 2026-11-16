import { Metadata } from "next";
import { fetchBrandPage, encodeBrandImageUrl } from "@/lib/brandPageDefaults";
import { buildPublicPageMetadata } from "@/lib/seo";
import BrandStoryView from "./client";

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const page = await fetchBrandPage();
  return buildPublicPageMetadata({
    title: page.seoTitle,
    description: page.seoDescription,
    path: "/brand",
    image: page.imageDesktop.url
      ? encodeBrandImageUrl(page.imageDesktop.url)
      : "/images/hover/hero.jpg",
    keywords: ["HOVER", "品牌故事", "服飾品牌"],
  });
}

export default async function BrandPage() {
  const page = await fetchBrandPage();
  return <BrandStoryView page={page} />;
}
