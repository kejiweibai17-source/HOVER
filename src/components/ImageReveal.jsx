"use client";

import { motion } from "framer-motion";
import Image from "next/image";

// 簡單 cn
const cn = (...a) => a.filter(Boolean).join(" ");

export default function ImageReveal({
  src,
  alt = "",
  className = "",
  delay = 0,
  duration = 1.6, // 拉長一點，效果更明顯
  fromScale = 1.28, // 初始放大
  toScale = 1,
  fromBlur = 10,
  toBlur = 0,
  fromOpacity = 0,
  toOpacity = 1,
  sizes = "(max-width: 768px) 100vw, 50vw",
  priority = false,
}) {
  if (!src) return null; // 防呆：避免 src 空字串

  return (
    <div className={cn("relative overflow-hidden  w-full h-full", className)}>
      {/* 圖片縮放/去模糊 */}
      <motion.div
        key={src}
        style={{ willChange: "transform, filter, opacity" }}
        initial={{
          scale: fromScale,
          filter: `blur(${fromBlur}px)`,
          opacity: fromOpacity,
        }}
        animate={{
          scale: toScale,
          filter: `blur(${toBlur}px)`,
          opacity: toOpacity,
        }}
        transition={{ delay, duration, ease: [0.22, 0.61, 0.36, 1] }}
        className="absolute inset-0"
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </motion.div>

      {/* ✅ 單一 overlay：由「全覆蓋」→ 往下收起（完全消失） */}
      <motion.div
        aria-hidden
        className="absolute inset-0 bg-white"
        initial={{ clipPath: "inset(0% 0% 0% 0%)" }} // 一開始全覆蓋
        animate={{ clipPath: "inset(100% 0% 0% 0%)" }} // 從上往下收光
        transition={{ delay, duration: duration * 0.35, ease: "easeInOut" }}
      />
    </div>
  );
}
