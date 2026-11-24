/** @type {import('next-sitemap').IConfig} */

const constructionOn = (() => {
  const v = String(process.env.SITE_CONSTRUCTION_MODE || "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
})();

module.exports = {
  // 1. 你的正式網域
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://www.hoverofficial.com",

  // 2. 自動產生 robots.txt
  generateRobotsTxt: true,
  sitemapSize: 7000,

  robotsTxtOptions: constructionOn
    ? {
        policies: [
          {
            userAgent: "*",
            disallow: "/",
          },
        ],
        transformRobotsTxt: async () =>
          [
            "# 建置中：禁止搜尋引擎收錄（網站仍可正常瀏覽）",
            "User-agent: *",
            "Disallow: /",
            "",
          ].join("\n"),
      }
    : {
        policies: [
          {
            userAgent: "*",
            allow: "/",
            disallow: [
              "/account",
              "/account/*",
              "/cart",
              "/checkout",
              "/admin",
              "/admin/*",
              "/api",
              "/api/*",
              "/login",
              "/register",
              "/forgot-password",
              "/reset-password",
              "/verify-email",
              "/thank-you",
              "/preview",
              "/coming-soon",
              "/auth/*",
            ],
          },
        ],
      },

  // 3. 排除不需要被搜尋引擎收錄的頁面 (例如結帳頁、會員中心)
  exclude: [
    "/cart",
    "/checkout",
    "/account",
    "/account/*",
    "/admin/*",
    "/api/*",
    "/sitemap.xml",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
    "/verify-email",
    "/thank-you",
    "/thinking",
    "/coming-soon",
    "/preview",
  ],

  // 4. 動態抓取 WooCommerce 產品，塞進實體 sitemap.xml 裡
  additionalPaths: async (config) => {
    // 首頁 sitelink 候選頁：提高 priority，協助搜尋引擎辨識重要子頁
    const paths = [
      { loc: "/products", changefreq: "daily", priority: 0.9 },
      { loc: "/brand", changefreq: "weekly", priority: 0.85 },
      { loc: "/membership", changefreq: "weekly", priority: 0.85 },
      { loc: "/how-to-buy", changefreq: "monthly", priority: 0.8 },
      { loc: "/faq", changefreq: "weekly", priority: 0.8 },
      { loc: "/returns", changefreq: "monthly", priority: 0.75 },
      { loc: "/contact", changefreq: "monthly", priority: 0.75 },
      { loc: "/privacy", changefreq: "yearly", priority: 0.4 },
      { loc: "/terms", changefreq: "yearly", priority: 0.4 },
      {
        loc: "/products?category=tops",
        changefreq: "weekly",
        priority: 0.8,
      },
      {
        loc: "/products?category=headwear",
        changefreq: "weekly",
        priority: 0.8,
      },
      {
        loc: "/products?category=socks",
        changefreq: "weekly",
        priority: 0.8,
      },
      {
        loc: "/products?category=bags",
        changefreq: "weekly",
        priority: 0.8,
      },
    ];

    // 讀取你在 .env.local 設定的環境變數
    const wpUrl = process.env.WC_API_BASE;
    const consumerKey = process.env.WC_CONSUMER_KEY;
    const consumerSecret = process.env.WC_CONSUMER_SECRET;

    // 🚨 防呆機制：如果沒讀到金鑰 (例如在 Vercel 忘記設定)，直接略過商品抓取，不中斷打包
    if (!wpUrl || !consumerKey || !consumerSecret) {
      console.warn(
        "⚠️ [next-sitemap] 警告：缺少 WooCommerce 環境變數，商品內頁將不會加入 sitemap。",
      );
      return paths;
    }

    try {
      const authString = Buffer.from(
        `${consumerKey}:${consumerSecret}`,
      ).toString("base64");
      // 確保網址結尾沒有多餘的斜線
      const baseUrl = wpUrl.replace(/\/$/, "");

      const res = await fetch(
        `${baseUrl}/wp-json/wc/v3/products?per_page=100&status=publish`,
        {
          headers: { Authorization: `Basic ${authString}` },
        },
      );

      if (res.ok) {
        const products = await res.json();

        // 將每個產品轉換為 sitemap 格式
        for (const product of products) {
          paths.push({
            loc: `/products/${product.slug}`,
            lastmod: new Date(
              product.date_modified || new Date(),
            ).toISOString(),
            changefreq: "weekly",
            priority: 0.9,
          });
        }
        console.log(
          `✅ [next-sitemap] 成功抓取 ${products.length} 筆商品加入 Sitemap!`,
        );
      } else {
        console.error(
          `❌ [next-sitemap] 抓取商品失敗，狀態碼: ${res.status}`,
        );
      }
    } catch (error) {
      console.error("❌ [next-sitemap] 執行發生錯誤:", error);
    }

    return paths;
  },
};
