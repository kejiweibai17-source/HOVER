// app/sitemap.js
import fs from "fs";
import path from "path";
import { fetchAllProducts } from "@/lib/woo"; // 你的 WooCommerce 抓取函式

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/**
 * 🔍 自動遞迴掃描 app 目錄下的所有靜態路由
 */
function getStaticRoutes(dir, baseRoute = "") {
  let routes = [];
  
  // 確保目錄存在（防呆）
  if (!fs.existsSync(dir)) return routes;

  const files = fs.readdirSync(dir);

  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      // 🛑 排除不需要產生 Sitemap 的特殊資料夾
      if (
        file.startsWith("[") ||    // 動態路由如 [slug] (後面會由 API 動態產出)
        file.startsWith("_") ||    // Next.js 私有資料夾
        file === "api" ||          // API Routes
        file === "components" ||   // 放元件的資料夾
        file === "admin"           // 管理後台（通常不給爬蟲抓）
      ) {
        continue;
      }

      // 處理 Route Groups (例如把 (marketing)/about 轉成 /about)
      const isRouteGroup = file.startsWith("(") && file.endsWith(")");
      const nextBaseRoute = isRouteGroup ? baseRoute : `${baseRoute}/${file}`;
      
      // 繼續往下層掃描
      routes = routes.concat(getStaticRoutes(fullPath, nextBaseRoute));
    } else {
      // 🎯 只要看到 page.js / page.jsx / page.tsx，就代表找到了一個頁面路徑
      if (file.match(/^page\.(js|jsx|ts|tsx)$/)) {
        routes.push(baseRoute === "" ? "/" : baseRoute);
      }
    }
  }

  return routes;
}

export default async function sitemap() {
  // ============================================================================
  // 1. 自動掃描並動態產生所有靜態頁面路徑
  // ============================================================================
  const appDirectory = path.join(process.cwd(), "app");
  const discoveredStaticPaths = getStaticRoutes(appDirectory);

  const staticRoutes = discoveredStaticPaths.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: route === "/" ? 1.0 : 0.8,
  }));

  // ============================================================================
  // 2. 動態抓取 WooCommerce 所有商品網址
  // ============================================================================
  let products = [];
  try {
    products = await fetchAllProducts();
  } catch (error) {
    console.error("Sitemap 產品抓取失敗:", error);
  }

  const productRoutes = products.map((product) => ({
    url: `${SITE_URL}/products/${product.slug}`,
    lastModified: new Date(product.date_modified || new Date()),
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  return [...staticRoutes, ...productRoutes];
}