"use client";
import React, { useRef, useEffect } from "react";
import { useLenis } from "@studio-freight/react-lenis";

const lerp = (start, end, factor) => start + (end - start) * factor;

const ParallaxImage = ({ src, alt, className = "" }) => {
  const imageRef = useRef(null);
  const containerRef = useRef(null); // 新增 container ref
  const bounds = useRef(null);
  const currentTranslateY = useRef(0);
  const targetTranslateY = useRef(0);
  const rafId = useRef(null);

  const updateBounds = () => {
    // 改為偵測外層 container 的位置，因為圖片本身會動
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    bounds.current = {
      top: rect.top + window.scrollY,
      bottom: rect.bottom + window.scrollY,
    };
  };

  useEffect(() => {
    updateBounds();
    window.addEventListener("resize", updateBounds);

    const animate = () => {
      if (imageRef.current) {
        currentTranslateY.current = lerp(
          currentTranslateY.current,
          targetTranslateY.current,
          0.1
        );
        // 修改重點：
        // 1. scale(1.5) 改為 scale(1.1)。
        //    這代表只放大 1.1 倍，剛好足夠做視差移動，又不會讓圖片過大。
        //    如果你希望完全不放大，可以改成 scale(1)，但移動幅度(0.1)要調得非常小以免露白。
        imageRef.current.style.transform = `translateY(${currentTranslateY.current}px) scale(1.1)`;
      }
      rafId.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", updateBounds);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  useLenis(({ scroll }) => {
    if (!bounds.current) return;
    const relativeScroll = scroll - bounds.current.top;
    // 0.1 是視差強度，如果不希望圖片動太快，可以調低這個數字
    targetTranslateY.current = relativeScroll * 0.1;
  });

  return (
    // 修改重點：
    // 1. 新增一個 div 作為外框，把 className 加在這裡 (控制高度與寬度)
    // 2. 設定 relative 與 overflow-hidden (隱藏跑出框外的圖片部分)
    <div 
      ref={containerRef} 
      className={`relative overflow-hidden ${className}`}
    >
      <img
        ref={imageRef}
        src={src}
        alt={alt}
        // 修改重點：
        // 1. w-full h-full object-cover: 確保圖片填滿容器且維持比例
        // 2. will-change-transform: 優化效能
        className="w-full h-full object-cover will-change-transform block" 
      />
    </div>
  );
};

export default ParallaxImage;