"use client";

import styles from "./style.module.scss";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
const words = ["宜園建設"];

// 文字淡入動畫
const opacity = {
  initial: { opacity: 0 },
  enter: { opacity: 0.75, transition: { duration: 1, delay: 0.2 } },
};

// 整體動畫
const slideUp = {
  initial: { top: 0 },
  exit: {
    top: "-100vh",
    transition: { duration: 1.2, ease: [0.76, 0, 0.24, 1], delay: 0.2 },
  },
};

// 進度條動畫時間
const progressDuration = 1.2; // 與 `slideUp` transition.duration 相同

export default function Index() {
  const [index, setIndex] = useState(0);
  const [dimension, setDimension] = useState({ width: 0, height: 0 });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleLoad = () => {
      setDimension({ width: window.innerWidth, height: window.innerHeight });
    };

    handleLoad();
    window.addEventListener("resize", handleLoad);
    return () => window.removeEventListener("resize", handleLoad);
  }, []);

  useEffect(() => {
    if (index >= words.length - 1) return;
    const timer = setTimeout(() => setIndex((prev) => prev + 1), 1000);
    return () => clearTimeout(timer);
  }, [index]);

  // 進度條同步動畫時間
  useEffect(() => {
    let progressInterval;
    if (progress < 100) {
      progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 5, 100));
      }, (progressDuration * 1000) / 45); // 讓進度條在 `progressDuration` 秒內完成
    }
    return () => clearInterval(progressInterval);
  }, [progress]);

  if (dimension.width === 0) return null;

  return (
    <motion.div
      variants={slideUp}
      initial="initial"
      animate="enter"
      exit="exit"
      className={styles.introduction}
    >
      {/* 文字動畫 */}

      <motion.p variants={opacity} initial="initial" animate="enter">
        <Image
          src="/images/yiyuan-logo-white.png"
          alt="Yiyuan Logo"
          width={200}
          height={100}
          layout="intrinsic"
          priority={true}
        />

        {/* {words[index]} */}
      </motion.p>

      {/* 進度條 */}
      <div className={styles.progressBarContainer}>
        <motion.div
          className={styles.progressBar}
          initial={{ width: "0%" }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: progressDuration, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
}
