// components/ArticleJsonLd.js
import React from "react";

export default function ArticleJsonLd({ post, siteUrl, imageUrl }) {
  const canonicalUrl = `${siteUrl}/blog/${post.slug}`;

  // 清除 HTML 標籤，萃取乾淨的描述
  const cleanDescription =
    post.excerpt?.rendered.replace(/<[^>]+>/g, "").substring(0, 160) ||
    "UFLOW 專業保健知識與營養專欄";

  // 1. 麵包屑結構化資料 (BreadcrumbList)
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首頁", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "保健專欄", item: `${siteUrl}/blog` },
      { "@type": "ListItem", position: 3, name: post.title.rendered, item: canonicalUrl },
    ],
  };

  // 2. 文章結構化資料 (BlogPosting)
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
    headline: post.title.rendered,
    description: cleanDescription,
    image: [imageUrl],
    datePublished: new Date(post.date).toISOString(),
    dateModified: new Date(post.modified).toISOString(),
    author: {
      "@type": "Organization",
      name: "UFLOW 專業營養團隊",
      url: siteUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "UFLOW 慶安有福",
      logo: {
        "@type": "ImageObject",
        url: `${siteUrl}/images/logo/uflow.png`,
      },
    },
    inLanguage: "zh-TW",
  };

  // 3. 商家資訊結構化資料 (HealthAndBeautyBusiness 適合保健食品)
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    name: "UFLOW 慶安有福",
    image: `${siteUrl}/images/logo/uflow.png`,
    "@id": siteUrl,
    url: siteUrl,
    telephone: "+886-2-0000-0000", // 👈 請替換為真實客服或公司電話 (建議加上國碼 +886)
    address: {
      "@type": "PostalAddress",
      streetAddress: "XX路XX號X樓", // 👈 請替換為真實街道地址
      addressLocality: "台北市",    // 👈 請替換為真實縣市
      postalCode: "100",           // 👈 請替換為真實郵遞區號
      addressCountry: "TW",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], // 👈 營業日
        opens: "09:00",  // 👈 營業開始時間
        closes: "18:00", // 👈 營業結束時間
      },
    ],
  };

  // 4. 常見問題結構化資料 (FAQPage)
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "UFLOW 的保健食品是哪裡生產的？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "我們所有的保健食品皆在台灣嚴格把關製造，並通過多項安全檢驗，確保消費者吃得安心。",
        },
      },
      {
        "@type": "Question",
        name: "吃 UFLOW 保健食品需要注意什麼？",
        acceptedAnswer: {
          "@type": "Answer",
          text: "建議依照產品包裝上的每日建議用量食用。如有特殊疾病、孕婦或哺乳期間，請先諮詢專業醫師意見。",
        },
      },
      // 👈 你可以在這裡繼續新增更多與 UFLOW 相關的常見問題
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
    </>
  );
}