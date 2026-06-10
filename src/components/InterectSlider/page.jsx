"use client";

import { useRef, useState } from "react";
import { gsap } from "gsap";

const images = [
  "/images/DSCF3094.jpg",
  "/images/ISIMG-1020962.JPEG",
  "/images/ISIMG-1096345.jpg",
];

const texts = [
  "這是第一張圖片的說明文字",
  "第二張圖片：主打 DEMO 效果展示",
  "第三張可支援任意長度的段落文字呈現，並滑入滑出動畫正常運作",
];

export default function GsapSlider() {
  const containerRef = useRef(null);
  const overlayRef = useRef(null);
  const imageWrapRef = useRef(null);
  const imageRef = useRef(null);
  const textRef = useRef(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const runRevealAnimation = (newIndex) => {
    const overlay = overlayRef.current;
    const imageWrap = imageWrapRef.current;
    const image = imageRef.current;
    const textEl = textRef.current;

    const tl = gsap.timeline({
      onComplete: () => {
        setIsAnimating(false);
      },
    });

    // 文字先往下滑出
    tl.to(
      textEl,
      {
        y: 50,
        opacity: 0,
        duration: 0.4,
        ease: "power2.out",
      },
      0
    );

    // 圖片初始狀態
    tl.set(imageWrap, {
      clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
    });

    tl.set(image, {
      filter: "blur(10px)",
      scale: 1.05,
    });

    // 遮罩蓋住
    tl.fromTo(
      overlay,
      {
        clipPath: "polygon(0% 0%, 100% 0%, 100% 0%, 0% 0%)",
      },
      {
        clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
        duration: 0.6,
        ease: "power3.inOut",
        onComplete: () => {
          setCurrentIndex(newIndex);
        },
      }
    );

    // 遮罩離開
    tl.to(overlay, {
      clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
      duration: 0.6,
      ease: "power3.inOut",
    });

    // 清晰化圖片
    tl.to(
      image,
      {
        filter: "blur(0px)",
        scale: 1,
        duration: 1.2,
        ease: "power2.out",
      },
      "-=0.6"
    );

    // 文字從下滑入
    tl.fromTo(
      textEl,
      {
        y: 50,
        opacity: 0,
      },
      {
        y: 0,
        opacity: 1,
        duration: 0.6,
        ease: "power2.out",
      },
      "-=0.3"
    );
  };

  const handleChange = (nextIndex) => {
    if (isAnimating || nextIndex === currentIndex) return;
    setIsAnimating(true);
    setTimeout(() => {
      runRevealAnimation(nextIndex);
    }, 20);
  };

  const handleNext = () => {
    const next = (currentIndex + 1) % images.length;
    handleChange(next);
  };

  const handlePrev = () => {
    const prev = (currentIndex - 1 + images.length) % images.length;
    handleChange(prev);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-3xl mx-auto">
      <div className="relative overflow-hidden h-[500px] bg-gray-100">
        <div className="animate-image-wrapper absolute top-0 left-0 w-full h-full">
          <div
            ref={overlayRef}
            className="overlay absolute inset-0 !bg-white z-20 pointer-events-none backdrop-blur-sm"
          />
          <div ref={imageWrapRef} className="image-container w-full h-full">
            <img
              ref={imageRef}
              src={images[currentIndex]}
              alt={`slide-${currentIndex}`}
              className="w-full h-full object-cover transition-all duration-300"
              onError={() =>
                console.error("圖片載入失敗:", images[currentIndex])
              }
            />
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-4">
        <button
          onClick={handlePrev}
          disabled={isAnimating}
          className="px-4 py-2 bg-gray-800 text-white rounded"
        >
          上一張
        </button>
        <button
          onClick={handleNext}
          disabled={isAnimating}
          className="px-4 py-2 bg-gray-800 text-white rounded"
        >
          下一張
        </button>
      </div>
    </div>
  );
}
