import { Metadata } from "next";
import FAQClient from "./client";
import { fetchPolicyPage } from "@/lib/fetchPolicyPage";
import { policyPageToFaqSchema } from "@/lib/policyPagesDefaults";
import {
  buildPublicPageMetadataFromPath,
  buildWebPageJsonLd,
} from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";

export const revalidate = 300;

export const metadata: Metadata = buildPublicPageMetadataFromPath("/faq");

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
      <JsonLd id="json-ld-faq-webpage" data={buildWebPageJsonLd({ path: "/faq" })} />
      <JsonLd id="schema-faq-page" data={schemaFAQ} />
      <FAQClient initial={page} />
    </>
  );
}
