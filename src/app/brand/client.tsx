// app/about/Client.tsx
"use client";

import React, { useEffect, useRef } from "react";
import { ReactLenis } from "@studio-freight/react-lenis";
import TextParallaxContentExample02 from "../../components/TextParallaxContent02/page";
// 🌟 引入圖片萃取工具
import { getAltTextFromUrl } from "../../lib/utils";

interface FAQ {
  question: string;
  answer: string;
}

interface ClientProps {
  faqs?: FAQ[];
}

export default function Client({ faqs = [] }: ClientProps) {
  // 🌟 1. 建立一個 Ref 用來綁定整個頁面容器
  const containerRef = useRef<HTMLDivElement>(null);

  // 🌟 2. 設置攔截器：掃描並優化底下所有的原生 <img> 標籤
  useEffect(() => {
    // 稍微延遲執行，確保子元件 (如 TextParallaxContentExample02) 的 DOM 都已經完全掛載
    const timer = setTimeout(() => {
      if (containerRef.current) {
        const images = containerRef.current.querySelectorAll("img");

        images.forEach((img, index) => {
          // [優化 A] 自動判斷並補上 alt 屬性
          const currentAlt = img.getAttribute("alt");
          if (!currentAlt || currentAlt.trim() === "") {
            const autoAlt = getAltTextFromUrl(
              img.src,
              `UFLOW 品牌理念與介紹 - 圖 ${index + 1}`,
            );
            img.setAttribute("alt", autoAlt);
            img.alt = autoAlt;
          }

          // [優化 B] 強制加上原生 Lazy Loading 提升首屏效能
          // 排除首圖 (index 0) 避免影響 LCP 效能，其餘都加上 lazy
          if (index > 0 && !img.getAttribute("loading")) {
            img.setAttribute("loading", "lazy");
            img.loading = "lazy";
          }

          // [優化 C] 確保圖片在手機版不會撐破版面
          img.style.maxWidth = "100%";
          img.style.height = "auto";
        });
      }
    }, 300); // 300ms 足以讓大部分的靜態/動態內容掛載完畢

    return () => clearTimeout(timer);
  }, []);

  return (
    <ReactLenis root>
      {/* 🌟 3. 將 ref 綁定在包覆內容的外層 div */}
      <div ref={containerRef} className="relative">
        {/* 載入你的視差滾動特效 (裡面的 img 也會被上面攔截到並優化！) */}
        <TextParallaxContentExample02 />

        {/* 🌟 品牌常見問題 FAQ 區塊 */}
        {faqs && faqs.length > 0 && (
          <section className="py-20 bg-white">
            <div className="container max-w-4xl mx-auto px-6">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  品牌常見問題
                </h2>
                <p className="text-gray-500">深入了解 UFLOW 的堅持與承諾</p>
              </div>
              <div className="space-y-6">
                {faqs.map((faq, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-50 p-6 md:p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-start gap-3">
                      <span className="text-blue-500 shrink-0">Q.</span>
                      <span>{faq.question}</span>
                    </h3>
                    <p className="text-gray-600 leading-relaxed flex items-start gap-3">
                      <span className="text-teal-600 font-bold shrink-0">
                        A.
                      </span>
                      <span>{faq.answer}</span>
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </div>
    </ReactLenis>
  );
}
