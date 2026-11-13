/** @type {import('next').NextConfig} */
const nextConfig = {
  // experimental: { ... }, // 如果有其他實驗性功能可以加在這裡

  // 避免本機 next dev 與 Vercel／next build 共用 .next 後產生路由、CSS 快取衝突。
  distDir: process.env.NODE_ENV === 'development' ? '.next-dev' : '.next',

  // X-Robots-Tag 改由 src/middleware.ts 控制（避免 headers 規則互相覆蓋）

  async redirects() {
    // 舊中文組合包網址 → 英文 slug（permanentRedirect 在 page 也有備援）
    return [
      {
        source: '/products/\u7d93\u5178\u7df9\u82b1\u4e2d\u7b52\u896a\u9ed1-\u767d\u96d9\u8272\u7d44\u5408\u5305',
        destination: '/products/classic-socks-bw',
        permanent: true,
      },
      {
        source: '/products/\u7d93\u5178\u7df9\u82b1\u4e2d\u7b52\u896a-\u9ed1-\u767d\u96d9\u8272\u7d44\u5408\u5305',
        destination: '/products/classic-socks-bw',
        permanent: true,
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