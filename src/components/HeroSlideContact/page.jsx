"use client";
import React, { useRef, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { CustomEase } from "gsap/CustomEase";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";

gsap.registerPlugin(CustomEase);

const imagePaths = [
  "/images/DSCF7774.jpg",
  "/images/DSCF7777.jpg",

  "/images/DSCF7845.jpg",
  // 你可以自由新增更多大圖路徑
];

export default function Photos() {
  const sliderImagesRef = useRef(null);
  const currentImg = useRef(1); // 記錄當前圖片索引
  const isAnimating = useRef(false); // 防連點鎖

  useGSAP(() => {
    // 註冊你原本的貝茲曲線緩動函數，這就是維持「原本過渡手感」的關鍵
    CustomEase.create(
      "hop2",
      "M0,0 C0.071,0.505 0.192,0.726 0.318,0.852 0.45,0.984 0.504,1 1,1",
    );
  }, []);

  // 核心：你原本的高級輪播動畫邏輯
  const animateSlide = (direction) => {
    // 如果正在動畫中，不允許再次觸發
    if (isAnimating.current) return;
    isAnimating.current = true;

    const totalSlides = imagePaths.length;

    // 更新索引
    if (direction === "right") {
      currentImg.current =
        currentImg.current < totalSlides ? currentImg.current + 1 : 1;
    } else {
      currentImg.current =
        currentImg.current > 1 ? currentImg.current - 1 : totalSlides;
    }

    const currentSlide = sliderImagesRef.current.lastElementChild;

    // 動態建立新的外層 div
    const slideImg = document.createElement("div");
    slideImg.className = "img absolute inset-0 w-full h-full overflow-hidden";

    // 動態建立新的 img
    const slideImgElem = document.createElement("img");
    slideImgElem.src = imagePaths[currentImg.current - 1];
    slideImgElem.className = "w-full h-full object-cover";
    // 預先設定圖片位置 (準備滑入)
    gsap.set(slideImgElem, { x: direction === "left" ? -500 : 500 });

    slideImg.appendChild(slideImgElem);
    sliderImagesRef.current.appendChild(slideImg);

    const tl = gsap.timeline({
      onComplete: () => {
        cleanupSlides();
        isAnimating.current = false; // 動畫結束，解鎖
      },
    });

    // 1. 舊圖片向反方向滑出
    tl.to(currentSlide.querySelector("img"), {
      x: direction === "left" ? 500 : -500,
      duration: 1.5,
      ease: "hop2",
    })
      // 2. 新容器利用 clipPath 遮罩展開
      .fromTo(
        slideImg,
        {
          clipPath:
            direction === "left"
              ? "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)" // 從左側展開
              : "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)", // 從右側展開
        },
        {
          clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)", // 展開至全螢幕
          duration: 1.5,
          ease: "hop2",
        },
        0,
      )
      // 3. 新圖片同時歸位 (營造視差感)
      .to(
        slideImgElem,
        {
          x: 0,
          duration: 1.5,
          ease: "hop2",
        },
        0,
      );
  };

  // 清理多餘的 DOM 元素，保持效能
  const cleanupSlides = () => {
    if (!sliderImagesRef.current) return;
    const imgElements = sliderImagesRef.current.querySelectorAll(".img");
    // 保留最後一個 (最新插入的)，刪除其他舊的
    if (imgElements.length > 1) {
      for (let i = 0; i < imgElements.length - 1; i++) {
        imgElements[i].remove();
      }
    }
  };

  // 控制功能
  const handleNext = () => animateSlide("right");
  const handlePrev = () => animateSlide("left");

  // 自動輪播 (每 5 秒觸發一次)
  useEffect(() => {
    const autoSlideInterval = setInterval(() => {
      animateSlide("right");
    }, 5000);

    return () => clearInterval(autoSlideInterval);
  }, []);

  return (
    <section className="relative mt-[90px] w-full h-screen min-h-[700px] flex flex-col bg-white overflow-hidden font-sans">
      {/* =========================================
          上半部：標題與藍色幾何切角 (保留新設計)
          ========================================= */}
      <div className="relative w-full h-[40%] md:h-[45%] flex items-center px-8 md:px-24 border-b-[13px] border-[#F58A9C]  bg-white z-20">
        <div
          className="absolute top-0 right-0 w-[80%] md:w-[60%] h-full bg-[#F58A9C]  z-0"
          style={{ clipPath: "polygon(25% 0, 100% 0, 100% 100%, 0% 100%)" }}
        >
          <div className="absolute top-1/2 right-[10%] w-32 h-[1px] bg-white/40"></div>
          <div className="absolute top-[45%] right-[20%] w-16 h-[1px] bg-white/40 transform -rotate-45"></div>
        </div>

        <div className="relative z-10 max-w-3xl">
          <h1 className="text-3xl md:text-5xl lg:text-[54px] font-bold text-gray-800 leading-[1.3] mb-6 tracking-tight">
            照顧你的健康 <br />
            你所想知道的，保健知識
          </h1>
          <p className="text-xs md:text-sm font-bold tracking-[0.25em] text-gray-800 uppercase">
            You Need to Know About Health
          </p>
        </div>
      </div>

      {/* =========================================
          下半部：單張大圖輪播區塊 (恢復原本效果)
          ========================================= */}
      <div className="relative w-full h-[60%] md:h-[55%] bg-gray-900   overflow-hidden">
        {/* 圖片容器 (你的原本動畫邏輯會在這裡動態塞入 DOM) */}
        <div ref={sliderImagesRef} className="absolute inset-0 w-full h-full">
          {/* 初始第一張圖片 */}
          <div className="img absolute inset-0 w-full h-full overflow-hidden">
            <img
              src={imagePaths[0]}
              alt="slide-initial"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* 右側浮動控制按鈕 (Floating Controls) */}
        <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-30">
          <button
            onClick={handlePrev}
            className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center text-[#F58A9C] hover:bg-[#F58A9C] hover:text-white transition-colors duration-300"
          >
            <ChevronLeft size={24} />
          </button>

          <button className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center text-gray-500 hover:text-[#F58A9C] transition-colors duration-300">
            <LayoutGrid size={20} />
          </button>

          <button
            onClick={handleNext}
            className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-full shadow-lg flex items-center justify-center text-[#F58A9C] hover:bg-[#F58A9C] hover:text-white transition-colors duration-300"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    </section>
  );
}
