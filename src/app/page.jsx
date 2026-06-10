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
    question: "UFLOW 的保健食品與市售產品有何不同？",
    answer:
      "我們堅持「科學調配、足量攝取」與成分全透明。嚴選如微脂體穀胱甘肽、韓國 GABAEX、義大利速可包覆鎂、專利益萃質等國際大廠專利原料，拒絕無效添加，針對亞洲體質打造有感的健康輔助方案。",
  },
  {
    question: "產品是哪裡製造的？食用安全嗎？",
    answer:
      "我們的產品皆在台灣符合 ISO22000 與 HACCP 規範的專業廠房製造，全系列產品皆通過第三方公正檢驗，不含西藥與重金屬，確保您每日食用安全無虞。",
  },
  {
    question: "訂購後大約幾天可以收到商品？有退換貨服務嗎？",
    answer:
      "現貨商品一般於訂單確認後 1-3 個工作天內出貨。全館單筆滿 NT$ 2,000 即享免運費。若收到商品包裝破損或內容有異，請於 7 日內聯繫 UFLOW 客服進行退換貨。惟因保健食品退貨後可能涉及衛生安全疑慮，除非商品本身有瑕疵，否則辦理退換貨時，請務必確保產品為全新且未拆封（封膜完整，且產品不得有任何明顯破損或污漬）。",
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
    name: "UFLOW",
    alternateName: "UFLOW 慶安有福保健食品",
    description: "功能性保健食品與營養補給｜專為亞洲體質研發・安心第三方檢驗",
    publisher: { "@id": `${SITE_URL}/#organization` },
    inLanguage: "zh-TW",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  const schemaOrganization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "慶安有福有限公司",
    alternateName: "UFLOW",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/images/logo/uflow.png`,
    },
    image: `${SITE_URL}/images/logo/uflow.png`,
    description:
      "UFLOW 專注於功能性保健食品與日常營養補給。主打科學調配、足量攝取，嚴選國際大廠專利原料，全系列通過第三方檢驗。",
    email: "uflowspace@gmail.com",
    telephone: "+886-978-138-979",
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+886-978-138-979",
      contactType: "customer service",
      email: "uflowspace@gmail.com",
      areaServed: "TW",
      availableLanguage: ["Traditional Chinese", "English"],
    },
    sameAs: [
      "https://www.facebook.com/uflow",
      "https://www.instagram.com/uflow",
      "https://line.me/R/ti/p/@uflow",
    ],
  };

  const schemaWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE_URL}/#webpage`,
    url: SITE_URL,
    name: "UFLOW｜科學足量保健食品",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
    description:
      "UFLOW 專注於功能性保健食品。主打微脂體肽晶芙蓉、日夜節奏管理 GABA鎂鎂香蜂草、專利維他菌合生元。拒絕無效添加，讓你補得安心、每日有感。",
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
    name: "UFLOW 主打科學專利保健食品",
    description:
      "為您推薦 UFLOW 最受歡迎的養顏美容、日夜調理與消化道健康食品。",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        url: `${SITE_URL}/products/肽晶芙蓉`,
        name: "肽晶芙蓉",
      },
      {
        "@type": "ListItem",
        position: 2,
        url: `${SITE_URL}/products/gaba鎂鎂香蜂草`,
        name: "GABA 鎂鎂香蜂草",
      },
      {
        "@type": "ListItem",
        position: 3,
        url: `${SITE_URL}/products/synbiotics`,
        name: "維他菌合生元",
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
