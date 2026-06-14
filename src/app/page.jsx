// app/page.jsx
import Client from "./home";
import { fetchAllProducts } from "@/lib/woo"; // 🚀 引入抓取商品的 API

// 🌟 1. 動態獲取網址，解決本地端與正式機網址判定問題
const getSiteUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_URL)
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return "http://localhost:3000";
};

const SITE_URL = getSiteUrl();

// 🌟 首頁動態 FAQ 資料
const homeFAQs = [
  {
    question: "HOVER 的服飾有什麼特色？",
    answer:
      "HOVER 精選兼具舒適、質感與實穿性的日常服飾，以簡約剪裁與中性風格為主，適合依照生活節奏自在穿搭。",
  },
  {
    question: "如何選擇適合的尺寸？",
    answer:
      "每款商品頁面皆提供尺寸指南，建議參考肩寬、胸寬、衣長等數據挑選。若仍有疑問，歡迎透過聯絡我們頁面洽詢客服。",
  },
  {
    question: "訂購後大約幾天可以收到商品？有退換貨服務嗎？",
    answer:
      "現貨商品一般於訂單確認後 1–3 個工作天內出貨。全館單筆滿 NT$2,000 享免運。若收到商品有瑕疵或錯誤，請於 7 日內聯繫 HOVER 客服協助處理。",
  },
];

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: "HOVER 威爾特｜輕盈穩定的日常服飾選品",
  description:
    "探索 HOVER 新作與熱銷單品——上衣、帽款、襪品到包袋。以舒適剪裁與簡約質感，陪你依照生活節奏自在穿搭。全館滿 NT$2,000 享免運。",
  keywords: [
    "HOVER",
    "威爾特",
    "日常服飾",
    "日常穿搭",
    "簡約服飾",
    "質感選品",
    "丹寧襯衫",
    "帽款",
    "襪子",
    "包袋",
    "台灣服飾品牌",
  ],
  icons: { icon: "/favicon.ico" },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: "/",
    siteName: "HOVER 威爾特",
    title: "HOVER 威爾特｜輕盈穩定的日常服飾選品",
    description:
      "探索 HOVER 新作與熱銷單品——上衣、帽款、襪品到包袋。以舒適剪裁與簡約質感，陪你依照生活節奏自在穿搭。全館滿 NT$2,000 享免運。",
    images: [
      {
        url: "/images/hover/hero.jpg",
        width: 1600,
        height: 900,
        alt: "HOVER 威爾特官方網站主視覺",
      },
    ],
  },
  alternates: { canonical: "/" },
};

export const revalidate = 60;

// 🚀 改為 async 函式，支援伺服器端抓取資料
export default async function Page() {
  const schemaWebSite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    url: SITE_URL,
    name: "HOVER",
    alternateName: "HOVER 威爾特",
    description: "輕盈穩定的日常服飾選品｜上衣、帽款、襪品、包袋",
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "zh-TW",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/products?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const schemaOrganization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "停機坪國際文創股份有限公司",
    alternateName: "HOVER",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/images/logo/logo.svg`,
    },
    image: `${SITE_URL}/images/hover/hero.jpg`,
    description:
      "HOVER 是一個為日常而設計的服飾品牌，精選兼具舒適、質感與實穿性的服飾單品。",
    email: "service@hoverofficial.com",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "service@hoverofficial.com",
      areaServed: "TW",
      availableLanguage: ["Traditional Chinese", "English"],
    },
  };

  const schemaWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE_URL}/#webpage`,
    url: SITE_URL,
    name: "HOVER 威爾特｜輕盈穩定的日常服飾選品",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
    description:
      "探索 HOVER 新作與熱銷單品——上衣、帽款、襪品到包袋。以舒適剪裁與簡約質感，陪你依照生活節奏自在穿搭。",
  };

  const schemaFAQ = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}/#faq`,
    mainEntity: homeFAQs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const schemaItemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${SITE_URL}/#collection`,
    name: "HOVER 精選商品",
    description: "探索 HOVER 熱銷服飾與配件。",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        url: `${SITE_URL}/products`,
        name: "全系列商品",
      },
    ],
  };

  // 🚀 核心：在伺服器端抓取 WooCommerce 商品資料
  let items = [];
  try {
    items = await fetchAllProducts();
    console.log("🌐 [首頁] 成功抓取 WooCommerce 商品數量:", items?.length);
  } catch (error) {
    console.error("❌ 首頁抓取產品失敗:", error);
  }

  return (
    <>
      <script
        type="application/ld+json"
        id="schema-website"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaWebSite) }}
      />
      <script
        type="application/ld+json"
        id="schema-organization"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrganization) }}
      />
      <script
        type="application/ld+json"
        id="schema-webpage"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaWebPage) }}
      />
      <script
        type="application/ld+json"
        id="schema-faq"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaFAQ) }}
      />
      <script
        type="application/ld+json"
        id="schema-itemlist"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaItemList) }}
      />

      {/* 🚀 把 faqs 和 items 一起傳遞給前端畫面 */}
      <Client />
    </>
  );
}
