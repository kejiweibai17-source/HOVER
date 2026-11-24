import { Metadata } from "next";
import TermsClient from "./client";
import { fetchPolicyPage } from "@/lib/fetchPolicyPage";
import {
  buildPublicPageMetadataFromPath,
  buildWebPageJsonLd,
} from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";

export const revalidate = 300;

export const metadata: Metadata = buildPublicPageMetadataFromPath("/terms");

export default async function TermsPage() {
  const { data } = await fetchPolicyPage("terms");
  return (
    <>
      <JsonLd id="json-ld-terms-webpage" data={buildWebPageJsonLd({ path: "/terms" })} />
      <TermsClient initial={data} />
    </>
  );
}
