// app/page.jsx
import Client from "./home";
import {
  fetchHeroSettings,
  getActiveHeroSlides,
} from "@/lib/heroDefaults";
import { fetchBrandStorySlides } from "@/lib/brandStoryDefaults";
import { fetchMidVideoSettings } from "@/lib/midVideoDefaults";
import { fetchCategoryTiles } from "@/lib/categoryGridDefaults";
import { fetchPeopleSlides } from "@/lib/peopleDefaults";
import { fetchHomeCarouselProducts } from "@/lib/homeProductsDefaults";
import { fetchShippingSettings } from "@/lib/shippingDefaults";
import {
  INDEXABLE_ROBOTS,
  SITE_NAME,
  buildOrganizationJsonLd,
  buildSitelinksJsonLd,
  buildWebSiteJsonLd,
  getPublicPageSeo,
  getSitelinkPages,
  getSiteUrl,
} from "@/lib/seo";
import { fetchBrandPage } from "@/lib/brandPageDefaults";
import JsonLd from "@/components/seo/JsonLd";

const SITE_URL = getSiteUrl();
const HOME_SEO = getPublicPageSeo("/");

async function getHomeFaqs() {
  const shipping = await fetchShippingSettings();
  const threshold = shipping.freeShipThreshold.toLocaleString("zh-TW");
  return [
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
      answer: `現貨商品一般於訂單確認後 1–3 個工作天內出貨。全館單筆滿 NT$${threshold} 享免運。若收到商品有瑕疵或錯誤，請於 7 日內聯繫 HOVER 客服協助處理。`,
    },
  ];
}

export async function generateMetadata() {
  const hero = await fetchHeroSettings();
  const heroImage =
    getActiveHeroSlides(hero).find((slide) => slide.image.url)?.image.url ||
    "/images/hover/hero.jpg";

  return {
    metadataBase: new URL(SITE_URL),
    title: HOME_SEO.title,
    description: HOME_SEO.description,
    keywords: HOME_SEO.keywords,
    robots: INDEXABLE_ROBOTS,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "zh_TW",
      url: "/",
      siteName: SITE_NAME,
      title: HOME_SEO.title,
      description: HOME_SEO.description,
      images: [
        {
          url: heroImage,
          alt: "HOVER 首頁品牌主視覺",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: HOME_SEO.title,
      description: HOME_SEO.description,
      images: [heroImage],
    },
  };
}

export const revalidate = 300;

// 🚀 改為 async 函式，支援伺服器端抓取資料
export default async function Page() {
  const [
    homeFAQs,
    brandPage,
    initialHero,
    initialBrandStory,
    initialMidVideo,
    initialCategoryGrid,
    initialPeople,
    homeCarousels,
  ] = await Promise.all([
    getHomeFaqs(),
    fetchBrandPage(),
    fetchHeroSettings(),
    fetchBrandStorySlides(),
    fetchMidVideoSettings(),
    fetchCategoryTiles(),
    fetchPeopleSlides(),
    fetchHomeCarouselProducts(),
  ]);

  // sitelink description 強制等於各頁自己的 meta description（品牌頁可吃後台設定）
  const sitelinkPages = getSitelinkPages({
    "/brand": {
      title: brandPage.seoTitle,
      description: brandPage.seoDescription,
      sitelinkName: "品牌故事",
    },
  });
  const { navigation, itemList } = buildSitelinksJsonLd(sitelinkPages, SITE_URL);

  const schemaWebPage = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE_URL.replace(/\/$/, "")}/#webpage`,
    url: SITE_URL.replace(/\/$/, ""),
    name: HOME_SEO.title,
    isPartOf: { "@id": `${SITE_URL.replace(/\/$/, "")}/#website` },
    about: { "@id": `${SITE_URL.replace(/\/$/, "")}/#organization` },
    description: HOME_SEO.description,
    hasPart: sitelinkPages.map((page) => ({
      "@type": "WebPage",
      name: page.sitelinkName,
      description: page.description,
      url: `${SITE_URL.replace(/\/$/, "")}${page.path}`,
    })),
  };

  const schemaFAQ = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL.replace(/\/$/, "")}/#faq`,
    mainEntity: homeFAQs.map((faq) => ({
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
      <JsonLd id="schema-website" data={buildWebSiteJsonLd(SITE_URL)} />
      <JsonLd id="schema-organization" data={buildOrganizationJsonLd(SITE_URL)} />
      <JsonLd id="schema-webpage" data={schemaWebPage} />
      <JsonLd id="schema-sitelinks-nav" data={navigation} />
      <JsonLd id="schema-sitelinks-list" data={itemList} />
      <JsonLd id="schema-faq" data={schemaFAQ} />

      {/* 視覺／可爬的主站導覽：連到各公開頁，輔助 Google 產生 sitelinks */}
      <nav aria-label="HOVER 主要頁面" className="sr-only">
        <ul>
          {sitelinkPages.map((page) => (
            <li key={page.path}>
              <a href={page.path} title={page.description}>
                {page.sitelinkName}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Client
        initialHero={initialHero}
        initialBrandStory={initialBrandStory}
        initialMidVideo={initialMidVideo}
        initialCategoryGrid={initialCategoryGrid}
        initialPeople={initialPeople}
        initialNewArrivals={homeCarousels.newArrivals}
        initialBestSeller={homeCarousels.bestSeller}
      />
    </>
  );
}
