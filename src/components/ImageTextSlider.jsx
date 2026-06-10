"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ImageReveal from "./ImageReveal";

// ✅ Demo 資料（雙主圖）
const data = [
  {
    title: "肽晶芙蓉",
    subtitle: "對美極度要求族群、醫美後保養族群、髮質脆弱族群、經常飲酒族群、",
    price: "重建17歲の素顏元氣",
    description: "不用蘋果光 也會有的澎澎自然",
    detail:
      "  不用打光，也能自帶澎潤感！UFLOW肽晶芙蓉專為對美極度要求的妳設計嚴選四大國際專利原料：美國微脂體穀胱甘肽提升200% 吸收率，高效抗氧化 ；日本冰晶番茄抵禦傷害， 搭配維生素C 與比利時美適矽(正矽酸復合物)，由內而外撐起神級美",
    mainImages: ["/images/DSCF7850.jpg", "/images/粉色01.png"],
    subImages: ["/images/粉003.png", "/images/DSCF7774.jpg"],
  },
  {
    title: "GABA鎂鎂香蜂草",
    subtitle:
      "不是一次性「把身體壓下來」，而是陪伴身體，走過一整天的節奏變化。",
    price: "國際原廠，專利足量",
    description: "節奏管理，不必等臨界線失控 ",
    detail:
      "不是失眠才需要，而是為了不過勞的你！UFLOW 獨創「1+1」保養哲學：白天一顆維持專注活力，夜晚一顆溫柔撫慰入眠 。嚴選三大國際頂規原料：韓國專利 GABA 穩定情緒、義大利高吸收鎂幫助代謝、法國香蜂草深層放鬆 。全成分產地、劑量透明公開，無藥性、零依賴，素食可食 。",
    mainImages: ["/images/鎂鎂香峰草-01.jpg", "/images/DSCF7801.jpg"],
    subImages: ["/images/三種01.png", "/images/藍色.png"],
  },
];

export default function ImageTextSlider({
  autoplay = true,
  interval = 5000, // 自動輪播間隔(ms)
  pauseOnHover = true,
}) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef(null);
  const isHoveringRef = useRef(false);

  const total = data.length;

  const go = useCallback(
    (dir = 1) => {
      setIndex((p) => {
        const next = (p + dir + total) % total;
        return next;
      });
    },
    [total],
  );

  const next = useCallback(() => {
    go(1);
    restartTimer(); // 手動點擊也重置計時
  }, [go]);

  const prev = useCallback(() => {
    go(-1);
    restartTimer();
  }, [go]);

  // 啟動 / 停止 / 重啟 計時器
  const startTimer = useCallback(() => {
    if (!autoplay || interval <= 0) return;
    clearTimer();
    timerRef.current = setInterval(() => {
      if (pauseOnHover && isHoveringRef.current) return; // 滑入暫停（可選）
      go(1);
    }, interval);
  }, [autoplay, interval, pauseOnHover, go]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const restartTimer = useCallback(() => {
    clearTimer();
    startTimer();
  }, [clearTimer, startTimer]);

  useEffect(() => {
    startTimer();
    return clearTimer;
  }, [startTimer, clearTimer]);

  // hover 暫停（可開關）
  const onMouseEnter = () => {
    if (!pauseOnHover) return;
    isHoveringRef.current = true;
  };
  const onMouseLeave = () => {
    if (!pauseOnHover) return;
    isHoveringRef.current = false;
  };

  const item = data[index];
  const [leftSrc, rightSrc] = item.mainImages;

  return (
    <div
      className="relative w-[95%] mx-auto lg:flex-row flex-col flex section-part gap-6"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* 左側：兩張並排（每次切換都讓左右圖各自跑動畫） */}
      <div className=" w-full lg:w-[65%] grid py-3 grid-cols-2 gap-4">
        {/* 左圖 */}
        <div className="relative aspect-[3/3.5] overflow-hidden">
          <ImageReveal
            key={`slide-${index}-left`} // 以索引+位置作為 key，強制 remount
            src={leftSrc}
            alt={`${item.title}-left`}
            className="h-full"
            delay={0}
            duration={2.2}
            fromScale={1.28}
            toScale={1}
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>

        {/* 右圖 */}
        <div className="relative aspect-[3/3.5] overflow-hidden">
          <ImageReveal
            key={`slide-${index}-right`}
            src={rightSrc}
            alt={`${item.title}-right`}
            className="h-full"
            delay={0.12}
            duration={2.2}
            fromScale={1.28}
            toScale={1}
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
      </div>

      {/* 右側：文字 + 縮圖 + 導覽 */}
      <div className=" w-full lg:w-[35%] py-3 px-3 sm:px-10 flex flex-col items-start justify-end relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={item.title}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            className="w-full"
          >
            <div className="title flex justify-between w-full">
              <div>
                <h3 className="font-bold text-[1.8rem]">{item.title}</h3>
                <p className="text-[.85rem] text-gray-600">{item.subtitle}</p>
              </div>
              <div className="text-[.8rem] text-gray-600">{item.price}</div>
            </div>

            <div className="content mt-8">
              <h4 className="font-bold text-[1.4rem]">{item.description}</h4>
              <p className="tracking-wider text-[.9rem] my-3 leading-loose">
                {item.detail}
              </p>
            </div>

            <div className="img-wrap flex flex-row">
              {item.subImages.filter(Boolean).map((img, i) => (
                <div key={i} className="w-1/2 px-1">
                  <Image
                    src={img}
                    alt={`sub-${i + 1}`}
                    width={400}
                    height={300}
                    className="w-full object-cover aspect-[4/3]"
                  />
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* 導覽按鈕 */}
        <div className="absolute top-0 right-0 flex gap-2">
          <button
            onClick={prev}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50"
            aria-label="上一個"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 hover:bg-gray-50"
            aria-label="下一個"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
