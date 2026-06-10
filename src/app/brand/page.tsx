// app/about/page.tsx
import { Metadata } from "next";
import Client from "./client"; // 注意大小寫，確保與實際檔名一致

export const revalidate = 60;

// 🌟 1. 動態獲取網址：本地端會顯示 localhost，正式上線設定變數後自動轉為正式網址
const getSiteUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_URL)
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return "http://localhost:3000";
};

const SITE_URL = getSiteUrl();

// 🌟 品牌專屬動態 FAQ 資料 (建立 E-E-A-T 信任度)
const aboutFAQs = [
  {
    question: "UFLOW 的品牌核心理念是什麼？",
    answer:
      "我們堅持「植萃天然」與「科學創新」，嚴選全球頂級原料，並與領先科研機構合作，打造高效配比，為您找回身體原本的循環與平衡。",
  },
  {
    question: "UFLOW 的產品有通過安全檢驗嗎？",
    answer:
      "是的，我們深信透明與信任是品牌基礎。所有產品的全成分皆公開透明，並且皆通過台灣專業第三方機構檢驗合格，確保您食用安心無負擔。",
  },
  {
    question: "產品的研發團隊背景為何？",
    answer:
      "我們由生醫產業研究出發選擇與全球領先的科學研究機構合作，確保每一款產品都符合最嚴格的品質標準，有效促進身心健康。",
  },
];

// ===================== 強化 SEO Metadata =====================
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL), // 核心：設定 base URL
  title: "關於 UFLOW｜科學實證保健食品品牌｜研發理念、第三方檢驗與永續承諾",
  description:
    "UFLOW 專注於以科學為本的保健食品與日常營養補給。從原料溯源、配方研發到第三方檢驗與永續包裝，我們以更透明的方式，陪伴每一次有效的日常補給。",
  keywords: [
    "關於 UFLOW",
    "保健食品品牌",
    "營養補充品",
    "第三方檢驗",
    "原料溯源",
    "功能性營養",
    "研發理念",
    "永續包裝",
    "UFLOW",
  ],
  icons: {
    icon: "/favicon.ico",
  },
  alternates: {
    canonical: "/about", // 搭配 metadataBase 使用相對路徑
  },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: "/about",
    siteName: "UFLOW 功能性保健食品",
    title: "關於 UFLOW｜科學實證保健食品品牌｜研發理念、第三方檢驗與永續承諾",
    description:
      "我們相信每一份補給都應該有根據、能感受、且對地球友善。了解 UFLOW 的品牌故事、研發流程與品質保證。",
    images: [
      {
        url: "/images/og/about-og.jpg", // 搭配 metadataBase 使用相對路徑
        width: 1200,
        height: 630,
        alt: "UFLOW 品牌形象與研發理念封面",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "關於 UFLOW｜科學實證保健食品品牌",
    description:
      "UFLOW 專注於以科學為本的保健食品與日常營養補給。了解我們的品牌故事、研發流程與品質保證。",
    images: ["/images/og/about-og.jpg"],
  },
};

export default function AboutPage() {
  // ===================== 👑 結構化資料 1：本地商家與品牌實體 =====================
  const schemaBusiness = {
    "@context": "https://schema.org",
    "@type": ["Organization", "HealthAndBeautyBusiness"],
    "@id": `${SITE_URL}/#organization`,
    name: "UFLOW 功能性保健食品",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/images/logo-04.png`, // 確保填入真實 LOGO 路徑
    },
    image: `${SITE_URL}/images/og/about-og.jpg`,
    description:
      "UFLOW 是一家以提供高品質健康產品為核心的品牌。我們的研發精神在於將科學方法應用於天然原料，以科技養護身心。",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      telephone: "+886-2-12345678", // 建議替換為實際電話
      email: "service@uflow.space", // 建議替換為實際信箱
      areaServed: "TW",
      availableLanguage: ["zh-TW", "en"],
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: "忠孝東路一段1號", // 建議替換為實際地址
      addressLocality: "台北市",
      addressRegion: "中正區",
      postalCode: "100",
      addressCountry: "TW",
    },
    sameAs: [
      "https://www.facebook.com/uflow",
      "https://www.instagram.com/uflow",
      "https://line.me/R/ti/p/@uflow",
    ],
    // 運送政策宣告 (符合 Google 商家滿額免運標準)
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Shipping Policies",
      itemListElement: [
        {
          "@type": "OfferShippingDetails",
          shippingDestination: {
            "@type": "DefinedRegion",
            addressCountry: "TW",
          },
          shippingRate: {
            "@type": "MonetaryAmount",
            value: "80", // 預設運費
            currency: "TWD",
          },
          freeShippingThreshold: {
            "@type": "DeliveryChargeSpecification",
            price: "1500", // 滿 1500 免運
            priceCurrency: "TWD",
          },
          deliveryTime: {
            "@type": "ShippingDeliveryTime",
            handlingTime: {
              "@type": "QuantitativeValue",
              minValue: 1,
              maxValue: 2,
              unitCode: "d",
            },
            transitTime: {
              "@type": "QuantitativeValue",
              minValue: 1,
              maxValue: 3,
              unitCode: "d",
            },
          },
        },
      ],
    },
  };

  // ===================== 👑 結構化資料 2：網頁資訊 =====================
  const schemaWebPage = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${SITE_URL}/about/#webpage`,
    url: `${SITE_URL}/about`,
    name: "關於 UFLOW｜科學實證保健食品品牌",
    description: "了解 UFLOW 的品牌故事、研發理念、第三方檢驗與永續承諾。",
    isPartOf: {
      "@id": `${SITE_URL}/#website`,
    },
    about: {
      "@id": `${SITE_URL}/#organization`,
    },
  };

  // ===================== 👑 結構化資料 3：麵包屑導覽 =====================
  const schemaBreadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `${SITE_URL}/about/#breadcrumb`,
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "首頁",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "關於我們",
        item: `${SITE_URL}/about`,
      },
    ],
  };

  // ===================== 👑 結構化資料 4：常見問題 FAQ =====================
  const schemaFAQ = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}/about/#faq`,
    mainEntity: aboutFAQs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      {/* 獨立拆分，逐一注入 JSON-LD 結構化資料，並移除包裹的 div */}
      <script
        type="application/ld+json"
        id="schema-business"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaBusiness) }}
      />
      <script
        type="application/ld+json"
        id="schema-webpage"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaWebPage) }}
      />
      <script
        type="application/ld+json"
        id="schema-breadcrumb"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaBreadcrumb) }}
      />
      <script
        type="application/ld+json"
        id="schema-faq"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaFAQ) }}
      />

      {/* 渲染包含動畫的 Client 端元件 */}
      <Client faqs={aboutFAQs} />
    </>
  );
}
