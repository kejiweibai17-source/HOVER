import { Metadata } from "next";
import Script from "next/script";
import FAQClient from "./client";
import { fetchPolicyPage } from "@/lib/fetchPolicyPage";
import { policyPageToFaqSchema } from "@/lib/policyPagesDefaults";

export const dynamic = "force-dynamic";

const getSiteUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.NEXT_PUBLIC_VERCEL_URL)
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  return "http://localhost:3000";
};

const SITE_URL = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "常見問題｜HOVER",
  description:
    "查看 HOVER 常見問題，包含商品、會員、付款、配送、退貨及購物相關資訊。",
  alternates: { canonical: "/faq" },
};

export default async function FAQPage() {
  const { data: page } = await fetchPolicyPage("faq");
  const faqItems = policyPageToFaqSchema(page);

  const schemaFAQ = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <>
      <Script
        id="schema-faq-page"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaFAQ) }}
      />
      <FAQClient initial={page} />
    </>
  );
}
