"use client";
import Marquee from "react-fast-marquee";
import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Play } from "lucide-react";
import { Link } from "next-view-transitions";
// 註冊 GSAP
gsap.registerPlugin(useGSAP);

// UFLOW 輪播資料
const slides = [
  {
    id: "01",
    title: "植萃天然\n嚴選全球頂級原料",
    desc: "回歸純粹的營養補給，給身體最無負擔的呵護。",
    img: "/images/DSCF7801.jpg",
  },
  {
    id: "02",
    title: "科學創新\n打造高效吸收配方",
    desc: "與全球領先科研機構合作，以實證數據為基礎。",
    img: "/images/DSCF7878.jpg",
  },
  {
    id: "03",
    title: "透明信任\n全成分公開安心看得見",
    desc: "通過多項台灣專業機構檢驗，品質嚴格把關。",
    img: "/images/DSCF7850.jpg",
  },
  {
    id: "04",
    title: "關懷共鳴\n傾聽您的真實需求",
    desc: "為您量身打造符合繁忙生活的健康節奏。",
    img: "/images/DSCF7777.jpg",
  },
  {
    id: "05",
    title: "專利配方\n醫師與營養師聯合推薦",
    desc: "結合頂尖科技與天然植萃，重塑身心平衡。",
    img: "/images/00912.png",
  },
  {
    id: "06",
    title: "養分循環\n由內而外散發健康光采",
    desc: "補充日常所需能量，找回最自信的自己。",
    img: "/images/粉紅.png",
  },
];

export default function FeatureShowcase() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScrollingUp, setIsScrollingUp] = useState(false); // 🚀 新增：判斷是否往回滾動
  const containerRef = useRef(null);
  const isAnimating = useRef(false);
  const total = slides.length;

  // --- 🚀 新增：偵測滑鼠滾動方向 ---
  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // 如果目前的捲動高度 小於 上一次的捲動高度，代表正在「往回滾(向上)」
      if (currentScrollY < lastScrollY) {
        setIsScrollingUp(true);
      } else {
        setIsScrollingUp(false);
      }

      lastScrollY = currentScrollY > 0 ? currentScrollY : 0;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // --- 🚀 新增：自動輪播邏輯 ---
  useEffect(() => {
    // 設定每 5 秒自動跳下一張
    const autoPlayTimer = setInterval(() => {
      handleNext();
    }, 5000);

    // 清除計時器 (當組件卸載或使用者手動切換時重新計算)
    return () => clearInterval(autoPlayTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  // --- 控制邏輯 ---
  const handleNext = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setCurrentIndex((prev) => (prev + 1) % total);
  };

  const handlePrev = () => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  };

  // --- 核心 GSAP 動畫 (響應式優化) ---
  useGSAP(
    () => {
      let mm = gsap.matchMedia();

      // Desktop (>= 768px): 執行原本的複雜空間計算動畫
      mm.add("(min-width: 768px)", () => {
        slides.forEach((_, i) => {
          let offset = (i - currentIndex + total) % total;
          if (offset > total / 2) offset -= total;

          const el = `.slide-container-${i}`;
          const imgInner = `.slide-img-${i}`;
          const duration = 1.2;
          const ease = "power3.inOut";

          if (offset === 0) {
            gsap.to(el, {
              x: "5vw",
              y: "15vh",
              width: "42vw",
              height: "60vh",
              opacity: 1,
              zIndex: 10,
              duration,
              ease,
            });
            gsap.to(imgInner, { scale: 1, duration, ease });
          } else if (offset === -1) {
            gsap.to(el, {
              x: "-50vw",
              y: "15vh",
              width: "42vw",
              height: "60vh",
              opacity: 0,
              zIndex: 5,
              duration,
              ease,
            });
          } else if (offset > 0) {
            const thumbWidth = 12;
            const gap = 1.5;
            const startLeft = 52;

            let xPos = startLeft + (offset - 1) * (thumbWidth + gap);
            let opacity = offset <= 3 ? 1 : 0;

            gsap.to(el, {
              x: `${xPos}vw`,
              y: "55vh",
              width: `${thumbWidth}vw`,
              height: "20vh",
              opacity: opacity,
              zIndex: 10 - offset,
              duration,
              ease,
            });
            gsap.to(imgInner, { scale: 1.1, duration, ease });
          } else {
            gsap.to(el, {
              x: "100vw",
              y: "55vh",
              width: "12vw",
              height: "20vh",
              opacity: 0,
              duration,
              ease,
            });
          }
        });
      });

      // Mobile (< 768px): 執行簡單的淡入淡出動畫
      mm.add("(max-width: 767px)", () => {
        slides.forEach((_, i) => {
          const el = `.slide-container-${i}`;
          const duration = 0.8;

          if (i === currentIndex) {
            gsap.to(el, {
              opacity: 1,
              zIndex: 10,
              duration,
              ease: "power2.out",
            });
          } else {
            gsap.to(el, {
              opacity: 0,
              zIndex: 1,
              duration,
              ease: "power2.inOut",
            });
          }
        });
      });

      setTimeout(() => {
        isAnimating.current = false;
      }, 1200);

      // 清理 matchMedia
      return () => mm.revert();
    },
    { scope: containerRef, dependencies: [currentIndex] },
  );

  return (
    <div className="w-full bg-[#f4f5f7] font-sans flex min-h-screen">
      {/* ==============================================
          左側 Sticky 導覽列
          ============================================== */}
      <div className="left-nav w-[60px] md:w-[80px] shrink-0 p-1 relative z-40">
        <aside
          className={`sticky-nav bg-white rounded-[6px] h-[calc(100vh-80px)] w-full sticky flex flex-col justify-between items-center py-8 border border-gray-100 shadow-[0_0_15px_rgba(0,0,0,0.03)] transition-all duration-300 ease-in-out ${
            isScrollingUp
              ? "top-[85px] md:top-[150px]" // 往回滾時的 top
              : "top-[15px] md:top-[2px]" // 往下滾時的 top
          }`}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 md:w-10 md:h-10 border-2 border-gray-800 rounded-full rounded-tr-none flex items-center justify-center">
              <div className="w-2 h-2 bg-gray-800 rounded-full"></div>
            </div>
            <p
              className="text-[8px] md:text-[10px] font-serif tracking-[0.2em] text-gray-500 mt-2"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              UFLOW
            </p>
          </div>
          <div>
            <Marquee speed={17}>
              {" "}
              <p
                className="text-[8px] md:text-[10px] font-serif tracking-[0.2em] text-gray-500 mb-8 mt-2"
                style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
              >
                ．REDISCOVER A HEALTHY LIFESTYLE．
              </p>
            </Marquee>
          </div>
          <div className="flex flex-col gap-4">
            <p
              className="text-[8px] md:text-[10px] font-serif tracking-[0.2em] text-gray-500 mb-8 mt-2"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              HEALTH
            </p>
          </div>
        </aside>
      </div>

      {/* ==============================================
          右側主要內容區塊 (Main)
          ============================================== */}
      <div className="main flex-1 p-1 pl-0 min-w-0">
        {/* --- 1. Hero Feature Slider 區塊 --- */}
        <section
          ref={containerRef}
          className="relative w-full h-[75vh] md:h-[90vh] min-h-[500px] md:min-h-[700px] overflow-hidden bg-white rounded-[6px] border border-gray-100"
        >
          <div className="absolute top-0 left-0 w-full px-6 md:px-10 py-6 flex justify-between items-center z-30 pointer-events-none">
            <h2 className="text-2xl md:text-3xl font-serif text-gray-800 tracking-wider">
              Feature
            </h2>
            <span className="text-[10px] md:text-xs font-medium text-gray-500 tracking-[0.2em]">
              品牌特色
            </span>
          </div>

          <div className="hidden md:block absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none select-none">
            <h1 className="text-[22vw] font-serif text-gray-200/40 tracking-[0.05em] leading-none whitespace-nowrap">
              UFLOW
            </h1>
          </div>

          {/* 控制按鈕 */}
          <div className="absolute top-[12vh] md:top-[12vh] right-[4vw] md:right-[6vw] z-40 flex gap-2 md:gap-3">
            <button
              onClick={handlePrev}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors bg-white/70 md:bg-white/50 backdrop-blur-sm"
            >
              <ArrowLeft size={16} strokeWidth={1.5} />
            </button>
            <button
              onClick={handleNext}
              className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-gray-300 flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors bg-white/70 md:bg-white/50 backdrop-blur-sm"
            >
              <ArrowRight size={16} strokeWidth={1.5} />
            </button>
          </div>

          {slides.map((slide, i) => (
            <div
              key={i}
              className={`slide-container-${i} absolute inset-0 md:inset-auto md:top-0 md:left-0 overflow-hidden bg-gray-200 cursor-pointer shadow-sm rounded-sm`}
              style={{
                opacity: i === currentIndex ? 1 : 0,
                zIndex: i === currentIndex ? 10 : 1,
              }}
              onClick={() => {
                if (
                  i !== currentIndex &&
                  !isAnimating.current &&
                  (i - currentIndex + total) % total <= 3
                ) {
                  isAnimating.current = true;
                  setCurrentIndex(i);
                }
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent z-10 md:hidden pointer-events-none"></div>
              <div className={`slide-img-${i} w-full h-full relative z-0`}>
                <Image
                  src={slide.img}
                  alt={slide.title}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority={i < 3}
                />
              </div>
            </div>
          ))}

          <div className="absolute bottom-[8vh] left-[6vw] right-[6vw] md:bottom-auto md:top-[20vh] md:left-[52vw] md:right-auto md:w-[35vw] z-30">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="flex flex-col items-start"
              >
                <div className="flex items-center gap-4 md:gap-6 text-white/80 md:text-gray-400 font-serif mb-4 md:mb-6 tracking-widest border-b border-white/30 md:border-transparent pb-2 md:pb-0">
                  <span className="text-lg md:text-xl text-white md:text-gray-800 font-medium">
                    {slides[currentIndex].id}
                  </span>
                  <span className="text-[10px] md:text-xs">0{total}</span>
                </div>

                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-medium text-white md:text-gray-900 leading-[1.4] md:leading-[1.6] whitespace-pre-line mb-6 drop-shadow-md md:drop-shadow-none">
                  {slides[currentIndex].title}
                </h2>

                <button className="flex items-center gap-3 md:gap-4 text-xs font-bold text-white md:text-gray-500 hover:text-gray-200 md:hover:text-gray-900 transition-colors group mt-2 md:mt-8">
                  了解更多
                  <div className="w-6 h-6 rounded-full border border-white/50 md:border-gray-300 flex items-center justify-center group-hover:border-white md:group-hover:border-gray-900 transition-colors">
                    <Play
                      size={8}
                      className="ml-0.5 fill-current text-white md:text-gray-500 md:group-hover:text-gray-900 transition-colors"
                    />
                  </div>
                </button>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* --- 2. 雙卡片導覽區塊 --- */}
        <section className="w-full border-t border-gray-100 bg-white mt-1 rounded-[6px] overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3">
            {/* 卡片 1 */}
            <Link href="/products/gaba鎂鎂香蜂草">
              {" "}
              <div className="group flex flex-col md:flex-row items-center justify-between p-10 md:p-16 lg:p-20 border-b lg:border-b-0 lg:border-r border-gray-100 hover:bg-[#fafafa] transition-colors duration-500 cursor-pointer">
                <div className="flex-1 pr-8 mb-8 md:mb-0 text-center md:text-left relative z-10">
                  <span className="font-serif text-gray-400 text-xl md:text-xl tracking-widest block mb-6 uppercase">
                    .Philosophy
                  </span>
                  <h3 className="text-xl md:text-[20px] font-bold text-gray-900 mb-3 tracking-wide">
                    從日常找回健康節奏
                  </h3>
                  <p className="text-[13px] md:text-sm text-gray-500 mb-12 tracking-wider">
                    讓健康成為一種簡單、自然的生活方式
                  </p>

                  <div className="inline-flex items-center gap-3 border-b border-gray-200 pb-2 group-hover:border-gray-800 transition-colors duration-300">
                    <span className="text-[11px] font-bold text-gray-700 tracking-widest">
                      了解更多
                    </span>
                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-gray-800 group-hover:text-white transition-all duration-300">
                      <ArrowRight size={10} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>

                <div className="w-40 h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 rounded-full overflow-hidden shrink-0 relative shadow-[0_4px_20px_rgba(0,0,0,0.03)] group-hover:scale-[1.03] transition-transform duration-700 ease-out">
                  <Image
                    src="/images/DSCF7801.jpg"
                    fill
                    className="object-cover"
                    alt="科學調配-足量攝取能量代謝新方-GABA鎂鎂香蜂草"
                    placeholder="empty"
                  />
                </div>
              </div>
            </Link>
            {/* 卡片 2 */}
            <Link href="/products/肽晶芙蓉">
              {" "}
              <div className="group flex flex-col md:flex-row items-center justify-between p-10 md:p-16 lg:p-20 hover:bg-[#fafafa] transition-colors duration-500 cursor-pointer">
                <div className="flex-1 pr-8 mb-8 md:mb-0 text-center md:text-left relative z-10">
                  <span className="font-serif text-gray-400 text-xl md:text-xl tracking-widest block mb-6 uppercase">
                    .Quality & Safety
                  </span>
                  <h3 className="text-xl md:text-[20px] font-bold text-gray-900 mb-3 tracking-wide">
                    嚴格把關的品質承諾
                  </h3>
                  <p className="text-[13px] md:text-sm text-gray-500 mb-12 tracking-wider">
                    全產品通過多項國際與台灣專業檢驗認證
                  </p>

                  <div className="inline-flex items-center gap-3 border-b border-gray-200 pb-2 group-hover:border-gray-800 transition-colors duration-300">
                    <span className="text-[11px] font-bold text-gray-700 tracking-widest">
                      了解更多
                    </span>
                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-gray-800 group-hover:text-white transition-all duration-300">
                      <ArrowRight size={10} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>

                <div className="w-40 h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 rounded-full overflow-hidden shrink-0 relative shadow-[0_4px_20px_rgba(0,0,0,0.03)] group-hover:scale-[1.03] transition-transform duration-700 ease-out">
                  <Image
                    src="/images/粉色01.png"
                    fill
                    className="object-cover"
                    alt="維持日常健康機能，打造純淨好體質-肽晶芙蓉"
                    placeholder="empty"
                  />
                </div>
              </div>
            </Link>
            <Link href="/products/synbiotics">
              {" "}
              <div className="group flex flex-col md:flex-row items-center justify-between p-10 md:p-16 lg:p-20 hover:bg-[#fafafa] transition-colors duration-500 cursor-pointer">
                <div className="flex-1 pr-8 mb-8 md:mb-0 text-center md:text-left relative z-10">
                  <span className="font-serif text-gray-400 text-xl md:text-xl tracking-widest block mb-6 uppercase">
                    .Quality & Safety
                  </span>
                  <h3 className="text-xl md:text-[20px] font-bold text-gray-900 mb-3 tracking-wide">
                    嚴格把關的品質承諾
                  </h3>
                  <p className="text-[13px] md:text-sm text-gray-500 mb-12 tracking-wider">
                    全產品通過多項國際與台灣專業檢驗認證
                  </p>

                  <div className="inline-flex items-center gap-3 border-b border-gray-200 pb-2 group-hover:border-gray-800 transition-colors duration-300">
                    <span className="text-[11px] font-bold text-gray-700 tracking-widest">
                      了解更多
                    </span>
                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 group-hover:bg-gray-800 group-hover:text-white transition-all duration-300">
                      <ArrowRight size={10} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>

                <div className="w-40 h-40 md:w-48 md:h-48 lg:w-56 lg:h-56 rounded-full overflow-hidden shrink-0 relative shadow-[0_4px_20px_rgba(0,0,0,0.03)] group-hover:scale-[1.03] transition-transform duration-700 ease-out">
                  <Image
                    src="/images/DSCF7878.jpg"
                    fill
                    className="object-cover"
                    alt="Quality"
                    placeholder="empty"
                  />
                </div>
              </div>
            </Link>
          </div>
        </section>

        {/* --- 3. Consultation 詳細預約區塊 --- */}
        <section className="w-full py-24 px-6 md:px-12 lg:px-20 bg-white font-sans overflow-hidden border-t border-gray-100 mt-1 rounded-[6px]">
          <div className="max-w-[1400px] mx-auto">
            <div className="flex justify-between items-end mb-16 border-b border-gray-200 pb-6">
              <h2 className="text-5xl md:text-[64px] font-serif text-[#333333] tracking-tight">
                Products
              </h2>
              <span className="text-sm font-bold text-gray-700 tracking-widest mb-2">
                慶安有福 保健食品
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
              <div className="lg:col-span-5 lg:pr-8 pt-4">
                <p className="text-gray-800 leading-[2.2] mb-8 font-medium text-[16px] md:text-[18px]">
                  我們嚴格挑選成分，確保每一項產品都能帶來實質的健康助益。慶安有福，與您一起守護健康每一天。
                </p>
                <p className="text-gray-600 leading-[2.2] text-[16px] md:text-[18px]">
                  從養顏美容到日常舒壓，我們提供多樣化的保健食品選擇。探索我們的產品，為您量身打造專屬的保健計畫。
                </p>
              </div>

              <div className="lg:col-span-7 flex flex-col mt-8 lg:mt-0 relative">
                <div className="hidden md:block absolute right-[-20px] lg:right-[-60px] top-[45%] -translate-y-1/2 w-64 h-64 lg:w-80 lg:h-80 rounded-full overflow-hidden shadow-lg border-[6px] border-white z-20">
                  <Image
                    src="/images/DSCF7850.jpg"
                    fill
                    className="object-cover"
                    alt="維他菌合生元 (Synbiotics)-結合益生菌與益生元之營養補給概念"
                    placeholder="empty"
                  />
                </div>

                <div className="bg-[#f2f6f7] p-8 md:p-12 lg:p-16 relative flex-1 z-10 rounded-t-sm">
                  <div className="relative z-20 w-full md:max-w-[65%] lg:max-w-[70%]">
                    <div className="text-center mb-10 relative">
                      <span className="bg-[#f2f6f7] px-4 text-[11px] font-bold tracking-widest text-gray-800 relative z-10 uppercase">
                        Our Products
                      </span>
                      <div className="absolute top-1/2 left-0 w-full border-t border-dotted border-gray-400 z-0"></div>
                    </div>

                    <div className="inline-block bg-[#f57d7d] text-white text-sm font-bold px-6 py-2.5 rounded-full mb-8 tracking-widest">
                      熱銷推薦
                    </div>

                    <h3 className="text-lg md:text-[22px] font-bold text-gray-900 leading-[1.8] mb-12">
                      <span className="border-b-[1.5px] border-gray-800 pb-1">
                        探索慶安有福全系列保健食品
                      </span>
                      <br />
                      <span className="border-b-[1.5px] border-gray-800 pb-1 inline-block mt-3">
                        找到最適合您的健康方案。
                      </span>
                    </h3>

                    <div className="flex flex-col mb-10">
                      <div className="flex justify-between items-center py-5 border-t border-dotted border-gray-400">
                        <span className="text-[13px] md:text-[15px] font-bold text-gray-700 tracking-wider">
                          產品種類
                        </span>
                        <span className="text-[15px] md:text-[17px] font-bold text-gray-900">
                          多樣選擇
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-5 border-t border-dotted border-gray-400">
                        <span className="text-[13px] md:text-[15px] font-bold text-gray-700 tracking-wider">
                          品質保證
                        </span>
                        <span className="text-[15px] md:text-[17px] font-bold text-gray-900">
                          多項國際與台灣專業檢驗認證
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-5 border-t border-b border-dotted border-gray-400">
                        <span className="text-[13px] md:text-[15px] font-bold text-gray-700 tracking-wider leading-relaxed">
                          嚴選成分・
                          <br />
                          高效吸收
                        </span>
                        <span className="text-[15px] md:text-[17px] font-bold text-gray-900">
                          科學實證
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] md:text-[11px] text-gray-500 leading-[1.8] tracking-wider">
                      <p>※ 產品詳細資訊請參閱包裝標示。</p>
                      <p>
                        ※
                        孕婦、哺乳期婦女或患有特殊疾病者，食用前建議先諮詢醫師意見。
                      </p>
                    </div>
                  </div>
                </div>

                <button className="w-full bg-[#f5a49f] hover:bg-[#f87777] transition-colors duration-300 py-6 md:py-8 px-8 md:px-12 flex justify-between items-center group rounded-b-sm relative z-20">
                  <Link href="/products">
                    {" "}
                    <span className="text-gray-900 font-bold text-lg tracking-widest">
                      探索所有產品
                    </span>
                  </Link>
                  <div className="w-7 h-7 rounded-full bg-[#3b3f42] flex items-center justify-center text-white group-hover:translate-x-2 transition-transform duration-300">
                    <ArrowRight size={14} strokeWidth={3} />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
