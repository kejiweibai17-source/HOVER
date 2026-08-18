import type { BrandPageSettings } from "@/lib/brandPageDefaults";
import {
  FALLBACK_BRAND_IMAGE,
  brandPageHasCustomImage,
  encodeBrandImageUrl,
} from "@/lib/brandPageDefaults";

function seoParagraphs(body: string): string[] {
  return body
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function SeoCopy({ page }: { page: BrandPageSettings }) {
  const paragraphs = seoParagraphs(page.seoBody);
  return (
    <article className="sr-only">
      <h1>{page.seoHeading}</h1>
      {paragraphs.map((p) => (
        <p key={p}>{p}</p>
      ))}
    </article>
  );
}

function FallbackLayout({ page }: { page: BrandPageSettings }) {
  return (
    <section className="relative h-[calc(100dvh-var(--hover-header-height,116px))] max-h-[calc(100dvh-var(--hover-header-height,116px))] w-full overflow-hidden bg-[#f3efe8]">
      <img
        src={FALLBACK_BRAND_IMAGE}
        alt={page.imageDesktop.alt || "HOVER 品牌故事"}
        className="absolute inset-0 h-full w-full object-cover object-[center_45%] md:object-center"
      />
      <div className="relative z-10 flex h-full flex-col justify-center px-6 py-12 sm:px-10 md:px-14 md:py-16 lg:pl-[7%] lg:pr-[48%] xl:pl-[8%]">
        <div className="mb-10 md:mb-14">
          <p className="text-[15px] leading-tight text-[#2a514d] md:text-[16px]">Brand</p>
          <p className="mt-0.5 text-[15px] leading-tight text-[#2a514d] md:text-[16px]">
            Story
          </p>
        </div>
        <h1 className="max-w-[520px] font-serif text-[24px] font-medium leading-[1.65] tracking-[0.03em] text-[#2a514d] sm:text-[28px] md:text-[34px] lg:text-[38px]">
          HOVER相信
          <br />
          真正的風格，不是被定義，
          <br />
          而是回到自己。
        </h1>
        <div className="my-7 h-px w-full max-w-[min(100%,420px)] bg-[#2a514d]/75 md:my-9" />
        <p className="max-w-[420px] text-[12px] leading-[2.1] tracking-[0.06em] text-[#2a514d] sm:text-[13px] md:text-[14px]">
          我們不追逐流行，只願找到屬於自己的經典
          <br />
          陪你走過每一個日常，成為自己喜歡的樣子
        </p>
      </div>
    </section>
  );
}

export default function BrandStoryView({ page }: { page: BrandPageSettings }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: page.seoTitle,
    description: page.seoDescription,
    headline: page.seoHeading,
    text: page.seoBody,
  };

  if (!brandPageHasCustomImage(page)) {
    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <FallbackLayout page={page} />
      </>
    );
  }

  const desktop = page.imageDesktop.url;
  const mobile = page.imageMobile.url || desktop;
  const alt = page.imageDesktop.alt || page.seoHeading || "HOVER 品牌故事";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="relative h-[calc(100dvh-var(--hover-header-height,116px))] max-h-[calc(100dvh-var(--hover-header-height,116px))] w-full overflow-hidden bg-[#f3efe8]">
        <img
          src={encodeBrandImageUrl(desktop)}
          alt={alt}
          className="absolute inset-0 hidden h-full w-full object-cover object-center md:block"
        />
        <img
          src={encodeBrandImageUrl(mobile)}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center md:hidden"
        />
        <SeoCopy page={page} />
      </section>
    </>
  );
}
