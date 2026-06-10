"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

// 定義四個狀態的資料
const mindData = [
  {
    id: 0,
    quote: "「毫無意義」",
    speaker: "- 理性說",
    position: "top-[20%] left-[10%] md:top-[25%] md:left-[25%]",
    align: "text-right",
    // 預留你之後替換的人物圖片路徑
    image: "/images/11.png",
  },
  {
    id: 1,
    quote: "「太冒險了」",
    speaker: "- 經驗說",
    position: "top-[40%] right-[10%] md:top-[45%] md:right-[20%]",
    align: "text-left",
    image: "/images/character-experience.png",
  },
  {
    id: 2,
    quote: "「不可能」",
    speaker: "- 驕傲說",
    position: "bottom-[30%] left-[10%] md:bottom-[35%] md:left-[25%]",
    align: "text-right",
    image: "/images/character-pride.png",
  },
  {
    id: 3,
    quote: "「試試看吧」",
    speaker: "- 心在低語",
    position: "bottom-[10%] right-[15%] md:bottom-[15%] md:right-[30%]",
    align: "text-left",
    isHeart: true, // 心的設計稍微不同（線條直指核心）
    image: "/images/character-heart.png",
  },
];

export default function MindCarouselBanner() {
  const [activeIndex, setActiveIndex] = useState(0);

  // 自動輪播機制：每 4 秒切換一次
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % mindData.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative w-full h-[80vh] min-h-[600px] bg-[#EAEAEA] flex items-center justify-center overflow-hidden font-sans">
      {/* --- 背景 SVG 雜訊紋理 (模擬圖片中的顆粒質感) --- */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
      {/* --- SVG 極簡細線 --- */}
      {/* 這裡使用簡單的圓弧與直線示意，你可以根據實際的 RWD 需求再做微調 */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none stroke-gray-500/50 fill-none"
        strokeWidth="0.5"
      >
        {/* 左上到右上圓弧 (理性 -> 經驗) */}
        <path
          d="M 35% 30% A 400 400 0 0 1 75% 40%"
          className="hidden md:block"
        />
        {/* 左下圓弧 (驕傲) */}
        <path
          d="M 35% 65% A 400 400 0 0 0 45% 75%"
          className="hidden md:block"
        />
        {/* 右下直線 (心) */}
        <line x1="50%" y1="50%" x2="65%" y2="80%" className="hidden md:block" />
      </svg>
      {/* --- 核心發光區塊 --- */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        {/* 藍色柔和漸層發光 */}
        <div className="w-[300px] h-[300px] md:w-[450px] md:h-[450px] bg-sky-500/40 rounded-full blur-[80px] md:blur-[100px]" />

        {/* 中心固定文字 */}
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <span className="text-white font-medium tracking-widest text-lg md:text-xl drop-shadow-md">
            the mind
          </span>
        </div>
      </div>

      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[250px] h-[250px] md:w-[350px] md:h-[350px] z-20 pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.05, y: -10 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="w-full h-full relative"
          >
            {/* 🛑 修正：刪除原本的佔位符 div，解開 `<Image>` 的註釋並替換 */}
            <Image
              src={mindData[activeIndex].image}
              alt={`Character - ${mindData[activeIndex].speaker}`} // 提供更有意義的 alt 文字
              fill
              className="object-contain"
            />
          </motion.div>
        </AnimatePresence>
      </div>
      {/* --- 四周文字區塊 --- */}
      {mindData.map((data, index) => {
        const isActive = activeIndex === index;
        return (
          <div
            key={data.id}
            className={`absolute z-30 transition-all duration-700 ease-in-out cursor-pointer ${data.position} flex flex-col ${data.align}`}
            onClick={() => setActiveIndex(index)} // 允許手動點擊切換
          >
            <motion.div
              animate={{
                color: isActive ? "#000000" : "#888888",
                scale: isActive ? 1.05 : 1,
                fontWeight: isActive ? 600 : 400,
              }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-base md:text-lg mb-1 leading-tight tracking-wide">
                {data.quote}
              </p>
              <p className="text-xs md:text-sm tracking-wider opacity-80">
                {data.speaker}
              </p>
            </motion.div>
          </div>
        );
      })}
      {/* --- 底部控制指示器 (選用) --- */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 z-40">
        {mindData.map((_, index) => (
          <button
            key={index}
            onClick={() => setActiveIndex(index)}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              activeIndex === index
                ? "bg-gray-800 w-6"
                : "bg-gray-400 hover:bg-gray-600"
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </section>
  );
}
