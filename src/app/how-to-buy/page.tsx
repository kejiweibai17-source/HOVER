import { Metadata } from "next";
import HowToBuyClient from "./client";
import { fetchPolicyPage } from "@/lib/fetchPolicyPage";
import {
  buildPublicPageMetadataFromPath,
  buildWebPageJsonLd,
} from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";

export const revalidate = 300;

export const metadata: Metadata = buildPublicPageMetadataFromPath("/how-to-buy");

export default async function HowToBuyPage() {
  const { data } = await fetchPolicyPage("how-to-buy");
  return (
    <>
      <JsonLd id="json-ld-how-to-buy-webpage" data={buildWebPageJsonLd({ path: "/how-to-buy" })} />
      <HowToBuyClient initial={data} />
    </>
  );
}
