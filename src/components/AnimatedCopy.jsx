"use client";
import React, { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

export default function AnimatedCopy({
  children,
  colorInitial = "#dddddd",
  colorAccent = "#abff02",
  colorFinal = "#000000",
}) {
  const containerRef = useRef(null);
  const splitRef = useRef(null);
  const lastProgress = useRef(0);
  const timers = useRef(new Map());
  const done = useRef(new Set());
  const stRef = useRef(null);

  useGSAP(
    async () => {
      const el = containerRef.current;
      if (!el) return;

      // 僅在瀏覽器載入外掛，避免 Next SSR 造成差異
      const [{ ScrollTrigger }, splitMod] = await Promise.all([
        import("gsap/ScrollTrigger"),
        import("gsap/SplitText"), // 若沒有 SplitText 會 throw；你有裝就 OK
      ]);
      const { SplitText } = splitMod;

      gsap.registerPlugin(ScrollTrigger, SplitText);

      // 清理前一次
      stRef.current?.kill();
      timers.current.forEach((t) => clearTimeout(t));
      timers.current.clear();
      done.current.clear();
      splitRef.current?.revert?.();

      // ✅ 一次分割 lines, words, chars；保留空白避免字距被擠掉
      splitRef.current = new SplitText(
        el.hasAttribute("data-copy-wrapper") ? el.children : el,
        {
          type: "lines,words,chars",
          wordsClass: "word",
          charsClass: "char",
          linesClass: "line",
          // 重要：保留空白與原始換行感
          reduceWhiteSpace: false,
        }
      );

      // 取得所有字元（多元素時也正確平鋪）
      const allChars = Array.from(el.querySelectorAll(".char"));
      gsap.set(allChars, { color: colorInitial, willChange: "color" });

      const scheduleToFinal = (char, idx) => {
        const old = timers.current.get(idx);
        if (old) clearTimeout(old);
        const t = setTimeout(() => {
          if (!done.current.has(idx)) {
            gsap.to(char, { color: colorFinal, duration: 0.12, ease: "none" });
            done.current.add(idx);
          }
          timers.current.delete(idx);
        }, 100);
        timers.current.set(idx, t);
      };

      // ✅ 捲動範圍覆蓋整段內容，進度更自然
      stRef.current = ScrollTrigger.create({
        trigger: el,
        start: "top bottom",
        end: "bottom top",
        scrub: 1,
        // markers: true, // 調試可開
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const progress = self.progress;
          const total = allChars.length || 1;
          const idx = Math.floor(progress * total);
          const down = progress >= lastProgress.current;

          allChars.forEach((char, i) => {
            // 往上捲回時，把未完成的重置
            if (!down && i >= idx) {
              const t = timers.current.get(i);
              if (t) clearTimeout(t);
              timers.current.delete(i);
              done.current.delete(i);
              gsap.set(char, { color: colorInitial });
              return;
            }

            if (done.current.has(i)) return;

            if (i <= idx) {
              gsap.set(char, { color: colorAccent });
              if (!timers.current.has(i)) scheduleToFinal(char, i);
            } else {
              gsap.set(char, { color: colorInitial });
            }
          });

          lastProgress.current = progress;
        },
      });

      return () => {
        stRef.current?.kill();
        timers.current.forEach((t) => clearTimeout(t));
        timers.current.clear();
        done.current.clear();
        splitRef.current?.revert?.();
      };
    },
    {
      scope: containerRef,
      dependencies: [colorInitial, colorAccent, colorFinal],
    }
  );

  // 單一子元素時，把 ref 掛在該元素；多個就用 wrapper
  if (React.Children.count(children) === 1) {
    return React.cloneElement(children, { ref: containerRef });
  }
  return (
    <div ref={containerRef} data-copy-wrapper="true">
      {children}
    </div>
  );
}
