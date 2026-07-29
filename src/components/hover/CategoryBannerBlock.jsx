"use client";

import { useEffect, useState } from "react";
import OptimizedImage from "@/components/hover/OptimizedImage";

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [breakpoint]);
  return mobile;
}

/**
 * 桌機 viewportFill：圖區撐滿外層 50vh shell 的剩餘高度，
 * 手機：16:9。
 * 文字永遠在圖下方白底，不疊圖。
 */
export default function CategoryBannerBlock({ banner, viewportFill = false }) {
  const isMobile = useIsMobile();
  const desktopUrl = banner.imageDesktop.url.trim();
  const mobileUrl = banner.imageMobile.url.trim() || desktopUrl;
  const imageUrl = isMobile ? mobileUrl : desktopUrl;
  const imageAlt =
    banner.imageDesktop.alt || banner.title.text || "分類 Banner";

  const showTitle = banner.title.show && banner.title.text.trim();
  const showSubtitle = banner.subtitle.show && banner.subtitle.text.trim();
  const showText = showTitle || showSubtitle;

  if (!imageUrl && !showText) return null;

  const fillDesktop = viewportFill && !isMobile;

  return (
    <section
      className={`w-full bg-white ${
        fillDesktop ? "flex min-h-0 flex-1 flex-col" : ""
      }`}
    >
      {imageUrl ? (
        <div
          className={`relative w-full overflow-hidden bg-[#eee] ${
            fillDesktop
              ? "min-h-0 flex-1"
              : isMobile
                ? "aspect-video"
                : "aspect-[4/1]"
          }`}
        >
          <OptimizedImage
            src={imageUrl}
            fullSrc={imageUrl}
            role="banner"
            alt={imageAlt}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
        </div>
      ) : null}

      {showText ? (
        <div
          className={`shrink-0 bg-white px-6 text-center md:px-12 ${
            fillDesktop ? "py-4 md:py-5" : "py-8 md:py-10"
          }`}
        >
          {showTitle ? (
            <h1
              className="font-semibold uppercase"
              style={{
                color: banner.title.color,
                fontSize: `${banner.title.fontSize}px`,
                letterSpacing: `${banner.title.letterSpacing}em`,
                lineHeight: 1.35,
              }}
            >
              {banner.title.text}
            </h1>
          ) : null}
          {showSubtitle ? (
            <p
              className={showTitle ? "mt-2 md:mt-3" : ""}
              style={{
                color: banner.subtitle.color,
                fontSize: `${banner.subtitle.fontSize}px`,
                letterSpacing: `${banner.subtitle.letterSpacing}em`,
                lineHeight: 1.6,
              }}
            >
              {banner.subtitle.text}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
