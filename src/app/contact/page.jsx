import Client from "./client";

const getSiteUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_URL)
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return "http://localhost:3000";
};

const SITE_URL = getSiteUrl();

export const metadata = {
  title: "聯絡我們｜HOVER 威爾特",
  description:
    "有任何商品、訂單或會員相關問題，歡迎透過 HOVER 聯絡我們表單與客服信箱取得協助。",
  keywords: ["HOVER", "聯絡我們", "客服", "服飾品牌"],
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: `${SITE_URL}/contact`,
    siteName: "HOVER 威爾特",
    title: "聯絡我們｜HOVER 威爾特",
    description:
      "有任何商品、訂單或會員相關問題，歡迎透過 HOVER 聯絡我們表單與客服信箱取得協助。",
    images: [
      {
        url: "/images/hover/hero.jpg",
        width: 1600,
        height: 900,
        alt: "HOVER 聯絡我們",
      },
    ],
  },
  alternates: {
    canonical: `${SITE_URL}/contact`,
  },
};

export const revalidate = 60;

export default function ContactPage() {
  return <Client />;
}
