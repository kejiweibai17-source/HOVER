import { Metadata } from "next";
import PrivacyClient from "./client";
import { fetchPolicyPage } from "@/lib/fetchPolicyPage";
import {
  buildPublicPageMetadataFromPath,
  buildWebPageJsonLd,
} from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";

export const revalidate = 300;

export const metadata: Metadata = buildPublicPageMetadataFromPath("/privacy");

export default async function PrivacyPage() {
  const { data } = await fetchPolicyPage("privacy");
  return (
    <>
      <JsonLd id="json-ld-privacy-webpage" data={buildWebPageJsonLd({ path: "/privacy" })} />
      <PrivacyClient initial={data} />
    </>
  );
}
