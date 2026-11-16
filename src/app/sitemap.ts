import { fetchAllProducts } from "@/lib/woo";
import { getSiteUrl, PUBLIC_SITEMAP_ROUTES } from "@/lib/seo";

/** 快取 1 小時，避免 Googlebot 每次都等 Woo 抓商品而逾時 */
export const revalidate = 3600;

export default async function sitemap() {
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  const now = new Date();

  const staticRoutes = PUBLIC_SITEMAP_ROUTES.map((route) => ({
    url: route.path === "/" ? `${siteUrl}/` : `${siteUrl}${route.path}`,
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
    const products = await Promise.race([
      fetchAllProducts(),
      new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 8000);
      }),
    ]);

    productRoutes = (products || [])
      .filter((product) => product?.slug)
      .map((product) => ({
        url: `${siteUrl}/products/${product.slug}`,
        lastModified: now,
        changeFrequency: "weekly" as const,
        priority: 0.9,
      }));
  } catch (error) {
    console.error("Sitemap 產品抓取失敗:", error);
  }

  // 即使商品抓取失敗，仍回傳公開靜態頁，避免 GSC 出現 HTTP 錯誤
  return [...staticRoutes, ...productRoutes];
}
