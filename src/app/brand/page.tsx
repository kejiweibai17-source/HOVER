import { Metadata } from "next";
import { fetchBrandPage, encodeBrandImageUrl } from "@/lib/brandPageDefaults";
import BrandStoryView from "./client";

export const dynamic = "force-dynamic";

const getSiteUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_URL)
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return "http://localhost:3000";
};

const SITE_URL = getSiteUrl();

export async function generateMetadata(): Promise<Metadata> {
  const page = await fetchBrandPage();
  return {
    metadataBase: new URL(SITE_URL),
    title: page.seoTitle,
    description: page.seoDescription,
    alternates: { canonical: "/brand" },
    openGraph: {
      title: page.seoTitle,
      description: page.seoDescription,
      url: "/brand",
      type: "website",
      images: page.imageDesktop.url
        ? [{ url: encodeBrandImageUrl(page.imageDesktop.url) }]
        : undefined,
    },
  };
}

export default async function BrandPage() {
  const page = await fetchBrandPage();
  return <BrandStoryView page={page} />;
}
