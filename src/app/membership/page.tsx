import { Metadata } from "next";
import MembershipClient from "./client";
import {
  buildPublicPageMetadataFromPath,
  buildWebPageJsonLd,
} from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";

export const revalidate = 300;

export const metadata: Metadata = buildPublicPageMetadataFromPath("/membership");

export default function MembershipPage() {
  return (
    <>
      <JsonLd id="json-ld-membership-webpage" data={buildWebPageJsonLd({ path: "/membership" })} />
      <MembershipClient />
    </>
  );
}
