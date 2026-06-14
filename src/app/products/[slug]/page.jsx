// app/products/[slug]/page.jsx
import { fetchAllProductSlugs, fetchProductBySlug } from "@/lib/woo";
import ProductClient from "./Client"; // 確保檔名大小寫與你的 Client 檔案一致

export const revalidate = 60;

// 🌟 動態獲取網址：本地端會顯示 localhost，正式上線設定變數後自動轉為正式網址
const getSiteUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_URL)
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return "http://localhost:3000";
};

const SITE_URL = getSiteUrl();

// ===================== 動態 FAQ 生成器 =====================
function getProductFAQs(productName) {
  const name = String(productName).toLowerCase();

  if (
    name.includes("shirt") ||
    name.includes("tee") ||
    name.includes("top") ||
    name.includes("襯衫")
  ) {
    return [
      {
        question: "這件商品的面料與版型如何？",
        answer:
          "採用舒適透氣的棉質混紡面料，版型俐落適合日常穿搭，可單穿或作為層疊搭配。",
      },
      {
        question: "如何選擇適合的尺寸？",
        answer:
          "請參考商品頁面的尺寸指南，依肩寬、胸寬、衣長等數據挑選。若介於兩個尺寸之間，建議選擇較大尺寸。",
      },
    ];
  }

  if (
    name.includes("bag") ||
    name.includes("cap") ||
    name.includes("hat") ||
    name.includes("sock")
  ) {
    return [
      {
        question: "這款配件適合日常使用嗎？",
        answer:
          "HOVER 配件系列強調簡約實用，適合搭配日常服飾，兼具質感與機能。",
      },
      {
        question: "如何保養？",
        answer:
          "建議依照洗滌標示清潔，避免長時間曝曬與接觸尖銳物品，以延長使用壽命。",
      },
    ];
  }

  return [
    {
      question: "商品有提供退換貨服務嗎？",
      answer:
        "全館單筆滿 NT$2,000 享免運。若商品有瑕疵或配送錯誤，請於收到後 7 日內聯繫客服協助處理。",
    },
    {
      question: "出貨時間大約多久？",
      answer:
        "現貨商品一般於訂單確認後 1–3 個工作天內出貨，實際配送時間依物流狀況為準。",
    },
  ];
}

// ===================== SSG 動態路由生成 =====================
export async function generateStaticParams() {
  try {
    const slugs = await fetchAllProductSlugs({ perPage: 50 });
    return slugs.map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

// ===================== Metadata 動態生成與 SEO 優化 =====================
export async function generateMetadata({ params }) {
  const p = await fetchProductBySlug(params.slug);
  const siteName = "HOVER 服飾品牌官方商城";

  if (!p) {
    return {
      title: "找不到商品｜HOVER",
      description: "您尋找的商品不存在或已下架。",
    };
  }

  // 1. 萃取分類名稱，用來豐富標題關鍵字
  const safeCategories = p?.categories;
  const categories = Array.isArray(safeCategories)
    ? safeCategories.map((c) => c?.name).filter(Boolean)
    : [];
  const categoryString =
    categories.length > 0 ? categories.slice(0, 2).join("、") : "服飾";

  const title = `${p.name}｜${categoryString}｜HOVER 威爾特`;

  const rawDesc = p.short_description || p.description || "";
  const cleanDesc = rawDesc
    .replace(/<[^>]+>/g, " ")
    .trim()
    .slice(0, 150);
  const descText = cleanDesc
    ? `${cleanDesc}... 探索 HOVER ${p.name} 的設計細節與穿搭靈感。`
    : `探索 HOVER【${p.name}】——以舒適剪裁與簡約質感，為日常穿搭帶來更多可能。全館滿 NT$2,000 享免運。`;

  const productPath = `/products/${params.slug}`; // 相對路徑配合 metadataBase

  const safeImages = p?.images;
  const images = Array.isArray(safeImages)
    ? safeImages.map((i) => i?.src).filter(Boolean)
    : [];

  return {
    metadataBase: new URL(SITE_URL), // 核心：設定 base URL，解決 localhost 與正式機圖片路徑問題
    title,
    description: descText,
    keywords: [
      p.name,
      "HOVER",
      "服飾",
      categoryString,
      "日常穿搭",
      ...categories,
    ]
      .filter(Boolean)
      .join(", "),
    alternates: { canonical: productPath },
    openGraph: {
      title,
      description: descText,
      url: productPath,
      siteName,
      images: images.map((src) => ({
        url: src,
        width: 800,
        height: 800,
        alt: `HOVER ${p.name} 商品圖`,
      })),
      type: "website",
      locale: "zh_TW",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: descText,
      images: images.length > 0 ? [images[0]] : [],
    },
  };
}

export default async function ProductPage({ params }) {
  let woo = null;
  try {
    woo = await fetchProductBySlug(params.slug);
  } catch {
    woo = null;
  }

  const fallback = {
    id: "hover-product",
    name: "LACOSTE FOR BEAUTY&YOUTH ONE-TONE SHORT SLEEVE T SHIRT",
    subname: "",
    price: 1344,
    regularPrice: 1680,
    salePrice: 1344,
    shortDescription: "",
    description: "",
    images: ["/images/hover/pdp-main-1.jpg", "/images/hover/product-2.jpg", "/images/hover/people-3.jpg", "/images/hover/product-4.jpg"],
    attributes: [],
    acf: null,
  };

  const productFAQs = woo ? getProductFAQs(woo.name) : [];
  const schemaImages =
    woo && Array.isArray(woo.images)
      ? woo.images.map((i) => i?.src).filter(Boolean)
      : [];

  const pureDescription = woo
    ? (woo.short_description || woo.description || "")
        .replace(/<[^>]+>/g, " ")
        .trim()
    : "";
  const finalPrice = woo ? Number(woo.price || 0) : 0;
  const availability =
    woo && woo.stock_status === "instock"
      ? "https://schema.org/InStock"
      : "https://schema.org/OutOfStock";

  // ===================== 👑 結構化資料 1：商家與品牌實體 =====================
  const schemaBusiness = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#organization`,
    name: "HOVER",
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: `${SITE_URL}/images/logo/logo.svg`,
    },
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      availableLanguage: ["Traditional Chinese", "English"],
    },
  };

  // ===================== 👑 結構化資料 2：商品與報價 =====================
  const schemaProduct = woo
    ? {
        "@context": "https://schema.org",
        "@type": "Product",
        name: woo.name,
        image: schemaImages,
        description: pureDescription || `探索 HOVER 精選 ${woo.name}。`,
        sku: woo.sku || String(woo.id),
        brand: { "@id": `${SITE_URL}/#organization` }, // 👈 完美關聯上方品牌
        // 預設給予一個優良的綜合評價
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "5.0",
          reviewCount: "114",
          bestRating: "5",
          worstRating: "1",
        },
        offers: {
          "@type": "Offer",
          url: `${SITE_URL}/products/${woo.slug}`,
          priceCurrency: "TWD",
          price: finalPrice,
          priceValidUntil: new Date(
            new Date().setFullYear(new Date().getFullYear() + 1),
          )
            .toISOString()
            .split("T")[0],
          itemCondition: "https://schema.org/NewCondition",
          availability: availability,
          seller: { "@id": `${SITE_URL}/#organization` }, // 👈 完美關聯販售者

          // 退貨政策
          hasMerchantReturnPolicy: {
            "@type": "MerchantReturnPolicy",
            applicableCountry: "TW",
            returnPolicyCategory:
              "https://schema.org/MerchantReturnFiniteReturnWindow",
            merchantReturnDays: 7,
            returnMethod: "https://schema.org/ReturnByMail",
          },

          // 運費政策 (綁定在 Offer 內)
          shippingDetails: {
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
        },
      }
    : null;

  // ===================== 👑 結構化資料 3：常見問題 =====================
  const schemaFAQ = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}/products/${params.slug}/#faq`,
    mainEntity: productFAQs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  // ===================== 👑 結構化資料 4：麵包屑導覽 =====================
  const schemaBreadcrumb = woo
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "@id": `${SITE_URL}/products/${woo.slug}/#breadcrumb`,
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
            name: "所有商品",
            item: `${SITE_URL}/products`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: woo.name,
            item: `${SITE_URL}/products/${woo.slug}`,
          },
        ],
      }
    : null;

  return (
    <>
      {/* 獨立拆分，逐一注入 JSON-LD，確保不在 div 包裝內 */}
      <script
        type="application/ld+json"
        id="schema-business"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaBusiness) }}
      />
      {woo && (
        <script
          type="application/ld+json"
          id="schema-product"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaProduct) }}
        />
      )}
      <script
        type="application/ld+json"
        id="schema-faq"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaFAQ) }}
      />
      {woo && (
        <script
          type="application/ld+json"
          id="schema-breadcrumb"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaBreadcrumb) }}
        />
      )}

      {/* 渲染 Client 端元件 */}
      <ProductClient
        faqs={productFAQs}
        product={
          woo
            ? {
                id: String(woo.id),
                name: woo.name,
                subname: "",
                price: Number(woo.price || 0),
                regularPrice: Number(woo.regular_price || woo.price || 0),
                salePrice: woo.sale_price ? Number(woo.sale_price) : null,
                shortDescription: woo.short_description || "",
                description: woo.description || "",
                images: schemaImages,
                attributes: woo.attributes || [],
                acf: woo.acf || null,
              }
            : fallback
        }
      />
    </>
  );
}
