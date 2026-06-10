"use client";

import { Pagination, Scrollbar, A11y, Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import AnimatedLink from "../AnimatedLink";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/scrollbar";
import Image from "next/image";
/**
 * @param {Object} props
 * @param {Array<{image:string, href?:string, title?:string, subtitle?:string, overlay?:boolean, alt?:string}>} props.banners
 * @param {string} [props.ratio]
 * @param {number|string} [props.height=600]
 * @param {{base?: number|string, md?: number|string, lg?: number|string, xl?: number|string}} [props.heights]
 * @param {number} [props.autoplayDelay=5000]
 * @param {number} [props.speed=1200]
 * @param {boolean} [props.loop=true]
 * @param {boolean} [props.centeredSlides=true]
 * @param {number} [props.slidesPerView=1]
 * @param {string} [props.paginationColor='#fff']
 */
export default function SwiperCardAbout({
  banners = [], // 預設值保持原樣或傳入
  ratio,
  height = 600,
  heights,
  autoplayDelay = 5000,
  speed = 1200,
  loop = true,
  centeredSlides = true,
  slidesPerView = 1,
  paginationColor = "#fff",
}) {
  const swiperVars = {
    ["--swiper-pagination-color"]: paginationColor,
    ["--swiper-navigation-color"]: paginationColor,
    ["--swiper-transition-timing-function"]:
      "cubic-bezier(0.645, 0.045, 0.355, 1)",
  };

  // 比例盒 paddingTop % (雖然你有寫但原本 className 寫死 aspect 所以這段可能沒用到，保留邏輯)
  const ratioPadding = (() => {
    if (!ratio) return null;
    const [w, h] = String(ratio).split("/").map(Number);
    if (!w || !h) return null;
    return `${(h / w) * 100}%`;
  })();

  // 斷點高度變數 (保留邏輯)
  const fixedHeightVars = (() => {
    if (ratioPadding) return {};
    const baseH =
      typeof height === "number" ? `${height}px` : String(height || "600px");
    const vars = {
      ["--banner-h-base"]: baseH,
      ["--banner-h-md"]: baseH,
      ["--banner-h-lg"]: baseH,
      ["--banner-h-xl"]: baseH,
    };
    if (heights?.base)
      vars["--banner-h-base"] =
        typeof heights.base === "number"
          ? `${heights.base}px`
          : String(heights.base);
    if (heights?.md)
      vars["--banner-h-md"] =
        typeof heights.md === "number" ? `${heights.md}px` : String(heights.md);
    if (heights?.lg)
      vars["--banner-h-lg"] =
        typeof heights.lg === "number" ? `${heights.lg}px` : String(heights.lg);
    if (heights?.xl)
      vars["--banner-h-xl"] =
        typeof heights.xl === "number" ? `${heights.xl}px` : String(heights.xl);
    return vars;
  })();

  return (
    <div className="w-full mx-auto mt-[10px] md:mt-[30px] xl:mt-[110px]  p-0">
      {!ratioPadding && (
        <style jsx>{`
          .banner-fixed-height {
            height: var(--banner-h-base);
          }
          @media (min-width: 768px) {
            .banner-fixed-height {
              height: var(--banner-h-md);
            }
          }
          @media (min-width: 1024px) {
            .banner-fixed-height {
              height: var(--banner-h-lg);
            }
          }
          @media (min-width: 1280px) {
            .banner-fixed-height {
              height: var(--banner-h-xl);
            }
          }
        `}</style>
      )}

      <Swiper
        modules={[Pagination, Scrollbar, A11y, Autoplay]}
        autoplay={{ delay: autoplayDelay, disableOnInteraction: false }}
        loop={loop}
        speed={speed}
        grabCursor
        centeredSlides={centeredSlides}
        slidesPerView={slidesPerView}
        pagination={{ clickable: true }}
        /**
         * 修改重點：
         * 1. 移除 aspect-[16/9]
         * 2. 加入 md:aspect-[1920/700] (桌機版依照 1920x700 比例)
         * 3. 手機版維持 aspect-[4/3] 或是 aspect-square，以免手機上看圖片變太細長
         */
        className="border relative aspect-[500/500]  sm:aspect-[1024/576] lg:aspect-[1920/849] overflow-hidden"
        style={swiperVars}
      >
        <SwiperSlide className="overflow-hidden group relative duration-1000">
          <Image
            src="/images/index/slider/1920x850/重返17歲の元氣.png"
            width={1920}
            height={850}
            placeholder="empty"
            priority
            className="w-full xl:block  hidden"
          ></Image>
          <Image
            src="/images/index/slider/1024x576/重建17歲的元氣-01.png"
            width={1024}
            height={576}
            placeholder="empty"
            priority
            className="w-full xl:hidden md:block  hidden"
          ></Image>
          <Image
            src="/images/index/slider/600x600/重建17歲的元氣-02.png"
            width={600}
            height={600}
            placeholder="empty"
            priority
            className="w-full md:hidden block "
          ></Image>
        </SwiperSlide>
        <SwiperSlide className="overflow-hidden group relative duration-1000">
          <Image
            src="/images/index/slider/1920x850/輕得自在_好菌留得住_維他菌合生元-uflow-慶安有福保健食品.png"
            width={1920}
            height={850}
            placeholder="empty"
            priority
            className="w-full xl:block  hidden"
          ></Image>
          <Image
            src="/images/index/slider/1024x576/維他菌合生元.webp"
            width={1024}
            height={576}
            placeholder="empty"
            priority
            className="w-full xl:hidden md:block  hidden"
          ></Image>
          <Image
            src="/images/index/slider/600x600/維他菌合生元.webp"
            width={600}
            height={600}
            placeholder="empty"
            priority
            className="w-full md:hidden block "
          ></Image>
        </SwiperSlide>
        <SwiperSlide className="overflow-hidden group relative duration-1000">
          <Image
            src="/images/index/slider/1920x850/節奏管理_不必等臨界線失控_GABA鎂鎂香蜂草_uflow-慶安有福保健食品.webp"
            width={1920}
            height={850}
            placeholder="empty"
            priority
            className="w-full xl:block  hidden"
          ></Image>
          <Image
            src="/images/index/slider/1024x576/節奏管理_不必等臨界線失控.webp"
            width={1024}
            height={576}
            placeholder="empty"
            priority
            className="w-full xl:hidden md:block  hidden"
          ></Image>
          <Image
            src="/images/index/slider/600x600/節奏管理_不必等臨界線失控.webp"
            width={600}
            height={600}
            placeholder="empty"
            priority
          ></Image>
        </SwiperSlide>
      </Swiper>
    </div>
  );
}
