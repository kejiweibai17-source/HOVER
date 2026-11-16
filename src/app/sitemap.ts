import { fetchAllProducts } from "@/lib/woo";
import { getSiteUrl, PUBLIC_SITEMAP_ROUTES } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap() {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const staticRoutes = PUBLIC_SITEMAP_ROUTES.map((route) => ({
    url: route.path === "/" ? siteUrl : `${siteUrl}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));

  let productRoutes: Array<{
    url: string;
    lastModified: Date;
    changeFrequency: "weekly";
    priority: number;
  }> = [];

  try {
    const products = await fetchAllProducts();
    productRoutes = (products || [])
      .filter((product) => product?.slug)
      .map((product) => ({
        url: `${siteUrl}/products/${product.slug}`,
        lastModified: new Date(product.date_modified || now),
        changeFrequency: "weekly" as const,
        priority: 0.9,
      }));
  } catch (error) {
    console.error("Sitemap 產品抓取失敗:", error);
  }

  return [...staticRoutes, ...productRoutes];
}
