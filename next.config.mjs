/** @type {import('next').NextConfig} */
const nextConfig = {
  // experimental: { ... }, // 如果有其他實驗性功能可以加在這裡

  images: {
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
      }
    ],
  },
};

export default nextConfig;