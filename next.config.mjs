/** @type {import('next').NextConfig} */
const nextConfig = {
  // experimental: { ... }, // 如果有其他實驗性功能可以加在這裡

  // 建置中：全站擋搜尋；政策頁必須可被 Facebook crawler 讀取（否則 Meta 判無效網址）
  async headers() {
    return [
      {
        // 排除隱私／條款／資料刪除（含靜態備援頁）
        source:
          "/:path((?!privacy$|terms$|data-deletion$|fb-data-deletion\\.html$).*)*",
        headers: [
          {
            key: "X-Robots-Tag",
            value: "noindex, nofollow, noarchive, nosnippet",
          },
        ],
      },
      {
        source: "/privacy",
        headers: [{ key: "X-Robots-Tag", value: "index, follow" }],
      },
      {
        source: "/terms",
        headers: [{ key: "X-Robots-Tag", value: "index, follow" }],
      },
      {
        source: "/data-deletion",
        headers: [{ key: "X-Robots-Tag", value: "index, follow" }],
      },
      {
        source: "/fb-data-deletion.html",
        headers: [{ key: "X-Robots-Tag", value: "index, follow" }],
      },
    ];
  },

  images: {
    // Vercel Image Optimization 額度用盡會回 402 導致全站破圖。
    // 關閉優化後直接載入原圖（WP／CDN），圖即可正常顯示。
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'inf.fjg.mybluehost.me',
      },
      {
        protocol: 'https',
        hostname: 'd2w53g1q050m78.cloudfront.net',
      },
      {
        protocol: 'https',
        hostname: 'coralclub.ru',
      },
      {
        protocol: 'https',
        hostname: 'ru.coral.club',
      },
      {
        protocol: 'https',
        hostname: 'i0.wp.com', // WordPress Jetpack CDN
      },
      {
        protocol: 'https',
        hostname: 'i1.wp.com', // WordPress Jetpack CDN
      },
      {
        protocol: 'https',
        hostname: 'i2.wp.com', // WordPress Jetpack CDN
      },
      {
        protocol: 'https',
        hostname: 'takidanifudouson.or.jp',
      },
      {
        protocol: 'https',
        hostname: 'shiroyamakumano-jinja.jp',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      },
      {
        protocol: 'https',
        hostname: 'gcm.org.tw', // 🚀 新增這個網域，解決 Invalid src prop 報錯
      },
      {
        protocol: 'https',
        hostname: 'united-arrows-global.com',
      },
      {
        protocol: 'https',
        hostname: 'lee.hpplus.jp',
      }
    ],
  },
};

export default nextConfig;