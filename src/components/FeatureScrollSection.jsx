"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const featuresData = [
  {
    id: "01",
    title: "植萃天然",
    desc: "嚴選全球頂級天然原料，回歸純粹的營養補給。",
    bgColor: "bg-blue-100",
  },
  {
    id: "02",
    title: "科學創新",
    desc: "與全球領先科研機構合作，以實證數據打造高效配方。",
    bgColor: "bg-yellow-100",
  },
  {
    id: "03",
    title: "透明信任",
    desc: "全成分公開透明，通過台灣專業機構檢驗，安心無負擔。",
    bgColor: "bg-green-100",
  },
  {
    id: "04",
    title: "關懷共鳴",
    desc: "傾聽使用者的真實需求，打造符合繁忙生活的健康節奏。",
    bgColor: "bg-purple-100",
  },
];

export default function FeatureScrollSection() {
  const containerRef = useRef(null);

  useGSAP(
    () => {
      const cards = gsap.utils.toArray(".feature-card");

      cards.forEach((card) => {
        // ✨ 絲滑綁定滾輪的 Timeline ( Scrub 模式 )
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: card,
            start: "top 85%", // 卡片頂端進入畫面 85% 時觸發
            end: "bottom 15%", // 卡片底端離開畫面 15% 時結束
            scrub: 1, // 1 秒的平滑慣性，超級絲滑的關鍵！
          },
        });

        // ✨ 完美的 3 段式動畫：進入 -> 停留 -> 離開
        tl.to(card, { opacity: 1, scale: 1, duration: 1, ease: "power1.out" }) // 1. 滑入變大
          .to(card, { opacity: 1, scale: 1, duration: 0.5 }) // 2. 螢幕中央停留片刻
          .to(card, {
            opacity: 0.9,
            scale: 0.8,
            duration: 1,
            ease: "power1.in",
          }); // 3. 離開變小
      });

      // 強制 GSAP 重新計算高度，防止抓錯位置
      setTimeout(() => ScrollTrigger.refresh(), 500);
    },
    { scope: containerRef },
  );

  return (
    <section
      ref={containerRef}
      className="relative w-full bg-[#f4f4f6] text-[#2c2c2c] py-12 lg:py-32"
    >
      {/* === 背景大文字凍結效果 === */}
      <div className="absolute top-[3%] lg:top-[10%] left-0 w-full z-0 pointer-events-none select-none overflow-hidden opacity-50 lg:opacity-100">
        <h2 className="text-[35vw] lg:text-[25vw] font-black text-[#e8e8eb] leading-none whitespace-nowrap -ml-[5%]">
          UFLOW UFLOW
        </h2>
      </div>

      {/* 💡 RWD 優化：手機版將整體佈局間距 gap 大幅縮小為 gap-2 (原本是 gap-8) */}
      <div className="max-w-[1400px] mx-auto px-5 sm:px-6 lg:px-12 relative z-10 flex flex-col lg:flex-row items-start gap-2 lg:gap-24">
        {/* === 左側：文字區塊 === */}
        {/* 💡 RWD 優化：大幅減少手機版的 pb (bottom padding) */}
        <div className="w-full lg:w-5/12 static lg:sticky lg:top-[18vh] z-20 pb-2 lg:pb-10 pt-6 lg:pt-0">
          <span className="text-xs sm:text-sm font-bold text-yellow-500 tracking-widest mb-3 lg:mb-4 uppercase inline-block">
            Our feature
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-3xl font-black leading-[1.4] tracking-wider mb-5 lg:mb-8 text-[#1a1a1a]">
            UFLOW 陪伴使用者找回了那份消失已久的「輕盈穩定感」。
            <br className="hidden sm:block" />{" "}
            <br className="hidden sm:block" />
            我們不只提供產品，更想邀你一起，感受身體重新開機、能量再次流動的美好時刻。
          </h2>
          <p className="text-stone-600 leading-loose mb-6 lg:mb-10 text-sm sm:text-[15px] lg:text-[16px] max-w-md">
            我們想做的，不是一盒放在架上的商品，而是一個能讓身體「活」起來的開關。為了實踐「流動
            (Flow)」的核心理念，研發過程比預期艱辛。
            <br />
            <br />
            我們不滿足於單一成分。過程中，我們推翻了超過 20
            種營養成分，翻閱了上百篇國際期刊。期待是一個完整的「微生態動力系統」。
          </p>

          <Link href="">
            <button className="bg-[#1a1a1a] text-white rounded-full px-6 lg:px-8 py-3.5 lg:py-4 text-sm lg:text-base font-bold w-fit flex items-center gap-3 lg:gap-4 hover:bg-gray-800 transition-colors duration-300 shadow-xl">
              我們的產品
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </Link>
        </div>

        {/* === 右側：滾動焦點卡片區塊 === */}
        <div className="w-full lg:w-7/12 flex flex-col relative z-10">
          {/* 💡 RWD 優化：手機版上方留白縮小為 pt-4，卡片與卡片的間距縮小為 gap-4 (原本是 gap-16) */}
          <div className="pt-4 lg:pt-[20vh] lg:pb-[20vh] flex flex-col gap-4 sm:gap-6 lg:gap-[35vh]">
            {featuresData.map((data, index) => (
              <div
                key={index}
                // ✨ 預設套用 Tailwind 的 opacity-90 與 scale-80
                className="feature-card opacity-90 scale-80 will-change-transform bg-white rounded-[24px] lg:rounded-[40px] p-6 sm:p-8 lg:p-14 w-full max-w-2xl mx-auto origin-center shadow-sm"
              >
                <div className="flex items-center gap-3 lg:gap-4 mb-4 lg:mb-6">
                  <span className="text-blue-600 font-bold tracking-widest text-[11px] lg:text-sm uppercase">
                    Point
                  </span>
                  <div className="w-6 lg:w-8 h-[2px] bg-blue-600"></div>
                  <span className="text-blue-600 font-bold text-[15px] lg:text-lg">
                    {data.id}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl lg:text-3xl font-bold leading-[1.5] mb-3 lg:mb-6 text-[#2c2c2c] whitespace-pre-line">
                  {data.title}
                </h3>
                <p className="text-gray-600 leading-relaxed text-[13px] sm:text-[15px] lg:text-[16px]">
                  {data.desc}
                </p>

                <div className="mt-6 lg:mt-10 relative w-full h-[120px] lg:h-[200px] flex justify-end items-center">
                  <div
                    className={`w-20 h-20 lg:w-32 lg:h-32 rounded-full ${data.bgColor} absolute right-6 lg:right-10 top-0 opacity-80 mix-blend-multiply`}
                  ></div>
                  <div className="w-24 h-24 lg:w-40 lg:h-40 bg-gray-50 rounded-2xl relative z-10 flex items-center justify-center text-gray-400 text-sm border-2 border-dashed border-gray-200 overflow-hidden">
                    <img
                      src="/images/植萃天然.jpg"
                      alt={data.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
