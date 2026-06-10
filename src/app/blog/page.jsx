// app/blog/page.jsx
import HomeClient from "./ProjectListClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://www.uflow.space";

// 🏆 核心設定：開啟 ISR 模式，每 60 秒自動在背景重新生成頁面 (抓取新文章)
export const revalidate = 60;

// ===================== 👑 頁面 Metadata 與 OpenGraph =====================
export const metadata = {
  title: "保健知識與健康生活方式 | UFLOW 慶安有福保健食品",
  description:
    "探索由 UFLOW 專業營養團隊撰寫的保健知識，包含益生菌、穀胱甘肽、GABA 等專業營養補充指南。",
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
  openGraph: {
    title: "保健知識與健康生活方式 | UFLOW 慶安有福",
    description: "由專業營養師撰寫的保健知識、日常營養補充指南。",
    url: `${SITE_URL}/blog`,
    siteName: "UFLOW 慶安有福",
    images: [
      {
        url: `${SITE_URL}/images/logo/uflow.png`,
        width: 1200,
        height: 630,
        alt: "UFLOW 保健知識專欄",
      },
    ],
    locale: "zh_TW",
    type: "website",
  },
};

// ===================== 🌟 API 抓取函式 =====================
async function getPosts() {
  const rawBase =
    process.env.WORDPRESS_API_URL ||
    "https://inf.fjg.mybluehost.me/website_4ad5d5f2";
  const cleanBase = rawBase.split("/wp-json")[0].replace(/\/$/, "");
  const fetchUrl = `${cleanBase}/wp-json/wp/v2/posts?_embed&per_page=10`;

  try {
    const res = await fetch(fetchUrl, {
      next: { revalidate: 60 },
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        Accept: "application/json",
      },
    });

    if (!res.ok) return [];

    const contentType = res.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) return [];

    const posts = await res.json();
    return Array.isArray(posts) ? posts : [];
  } catch (error) {
    console.error("❌ API 抓取失敗:", error);
    return [];
  }
}

export default async function BlogPage() {
  const posts = await getPosts();

  // ===================== 👑 分類結構化資料 (JSON-LD) =====================

  // 1. 麵包屑導覽 (Breadcrumb)
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "首頁", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "保健知識 Blog",
        item: `${SITE_URL}/blog`,
      },
    ],
  };

  // 2. 部落格本體宣告 (Blog)
  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${SITE_URL}/blog/#blog`,
    name: "UFLOW 保健知識與健康生活 Blog",
    description: "由專業營養師撰寫的保健知識、日常營養補充指南。",
    url: `${SITE_URL}/blog`,
    publisher: {
      "@type": "Organization",
      name: "UFLOW 慶安有福",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/images/logo/uflow.png`,
      },
    },
  };

  // 3. 文章列表索引 (ItemList) - 告訴 Google 這裡有哪些文章
  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: posts.map((post, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: `${SITE_URL}/blog/${post.slug}`,
    })),
  };

  // 4. 商家資訊 (HealthAndBeautyBusiness)
  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    name: "UFLOW 慶安有福",
    image: `${SITE_URL}/images/logo/uflow.png`,
    "@id": SITE_URL,
    url: SITE_URL,
    telephone: "+886-2-0000-0000", // 👈 請替換為真實客服或公司電話
    address: {
      "@type": "PostalAddress",
      streetAddress: "XX路XX號X樓", // 👈 請替換為真實街道地址
      addressLocality: "台北市", // 👈 請替換為真實縣市
      postalCode: "100", // 👈 請替換為真實郵遞區號
      addressCountry: "TW",
    },
  };

  return (
    <main>
      {/* 獨立注入各類型的 JSON-LD，讓 Google 爬蟲清晰解析 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessSchema),
        }}
      />

      {/* 渲染前端畫面元件 */}
      <HomeClient posts={posts} />
    </main>
  );
}
