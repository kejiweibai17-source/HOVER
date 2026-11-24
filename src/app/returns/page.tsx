import { Metadata } from "next";
import ReturnsClient from "./client";
import { fetchPolicyPage } from "@/lib/fetchPolicyPage";
import {
  buildPublicPageMetadataFromPath,
  buildWebPageJsonLd,
} from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";

export const revalidate = 300;

export const metadata: Metadata = buildPublicPageMetadataFromPath("/returns");

export default async function ReturnsPage() {
  const { data } = await fetchPolicyPage("returns");
  return (
    <>
      <JsonLd id="json-ld-returns-webpage" data={buildWebPageJsonLd({ path: "/returns" })} />
      <ReturnsClient initial={data} />
    </>
  );
}
