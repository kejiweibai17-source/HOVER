import { Metadata } from "next";
import Script from "next/script";
import FAQClient from "./client";
import { FAQ_SECTIONS } from "./faq-data";

export const revalidate = 60;

const getSiteUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_URL)
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return "http://localhost:3000";
};

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "常見問題｜HOVER 威爾特",
  description:
    "HOVER 常見問題：客服與訂單、商品出貨、付款發票、退貨退款及商品保養說明。",
  alternates: { canonical: "/faq" },
  openGraph: {
    type: "website",
    locale: "zh_TW",
    url: "/faq",
    siteName: "HOVER 威爾特",
    title: "常見問題｜HOVER 威爾特",
    description:
      "HOVER 官方網站常見問題完整解答。",
  },
};

const schemaFAQ = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_SECTIONS.flatMap((section) =>
    section.items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  ),
};

export default function FAQPage() {
  return (
    <>
      <Script
        id="schema-faq-page"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaFAQ) }}
      />
      <FAQClient />
    </>
  );
}
