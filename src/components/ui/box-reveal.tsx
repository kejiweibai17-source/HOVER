"use client";

import { useEffect, useRef } from "react";
import { motion, useAnimation, useInView } from "framer-motion";

interface BoxRevealProps {
  children: JSX.Element;
  width?: "fit-content" | "100%";
  boxColor?: string;
  duration?: number;
}

export const BoxReveal = ({
  children,
  width = "fit-content",
  boxColor,
  duration,
}: BoxRevealProps) => {
  const mainControls = useAnimation(); // 控制主内容动画
  const slideControls = useAnimation(); // 控制滑动框动画

  const ref = useRef(null); // 引用盒子
  const isInView = useInView(ref, { once: true }); // 当盒子进入视图时触发

  useEffect(() => {
    // 当盒子进入视窗时启动动画
    if (isInView) {
      slideControls.start("visible");
      mainControls.start("visible");
    } else {
      slideControls.start("hidden");
      mainControls.start("hidden");
    }
  }, [isInView, mainControls, slideControls]); // 监听视窗状态变化

  return (
    <div ref={ref} style={{ position: "relative", width, overflow: "hidden" }}>
      <motion.div
        variants={{
          hidden: { opacity: 0, y: 75 },
          visible: { opacity: 1, y: 0 },
        }}
        initial="hidden"
        animate={mainControls}
        transition={{
          duration: duration ? duration : 0.5,
          delay: 0.25,
        }}
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          height: "100%",
        }}
      >
        {children}
      </motion.div>

      <motion.div
        variants={{
          hidden: { left: 0 }, // 初始滑动框在左侧
          visible: { left: "100%" }, // 动画结束时滑动框移至右侧
        }}
        initial="hidden"
        animate={slideControls}
        transition={{
          duration: duration ? duration : 0.5, // 动画时长
          ease: "easeIn", // 使用 easeIn 缓动效果
        }}
        style={{
          position: "absolute",
          top: 4,
          bottom: 4,
          left: 0,
          right: 0,
          zIndex: 20,
          background: boxColor ? boxColor : "#5046e6", // 如果有传入 boxColor 使用传入的颜色
        }}
      />
    </div>
  );
};

export default BoxReveal;
