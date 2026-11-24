import Client from "./client";
import {
  buildPublicPageMetadataFromPath,
  buildWebPageJsonLd,
} from "@/lib/seo";
import JsonLd from "@/components/seo/JsonLd";

export const metadata = buildPublicPageMetadataFromPath("/contact");

export const revalidate = 60;

export default function ContactPage() {
  return (
    <>
      <JsonLd id="json-ld-contact-webpage" data={buildWebPageJsonLd({ path: "/contact" })} />
      <Client />
    </>
  );
}
