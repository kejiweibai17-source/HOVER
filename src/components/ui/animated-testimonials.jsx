"use client";

import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useEffect, useState, useCallback } from "react";
import { useSwipeable } from "react-swipeable";

export const AnimatedTestimonials = ({
  testimonials,
  decorativeImages = [], // 接收外部傳入的三張裝飾圖
  autoplay = true,
}) => {
  const [active, setActive] = useState(0);

  const handleNext = useCallback(() => {
    setActive((prev) => (prev + 1) % testimonials.length);
  }, [testimonials.length]);

  const handlePrev = useCallback(() => {
    setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  }, [testimonials.length]);

  const isActive = (index) => index === active;

  useEffect(() => {
    if (autoplay) {
      const interval = setInterval(handleNext, 5000);
      return () => clearInterval(interval);
    }
  }, [autoplay, handleNext]);

  const randomRotateY = () => Math.floor(Math.random() * 21) - 10;

  const handlers = useSwipeable({
    onSwipedLeft: handleNext,
    onSwipedRight: handlePrev,
    preventScrollOnSwipe: true,
    trackTouch: true,
    trackMouse: false,
  });

  return (
    // 1. 加入 overflow-hidden 防止手機板橫向捲軸
    // 2. 調整寬度 w-[90%] 適應手機，md:w-[70%] 維持電腦版
    // 3. 調整上下 padding
    <div className="relative w-[90%] md:w-[80%] mt-10 lg:w-[70%] z-[999] mx-auto antialiased font-sans mr-[26%] py-0 md:py-10 lg:py-20 xl:px-0 overflow-visible">
      {/* 背景裝飾線條 - 手機板調整位置與大小 */}
      <div className="absolute svg-line-pink w-[150vw] md:w-[99vw] xl:w-[99vw] 2xl:w-[88vw] z-50 right-[-20%] md:right-[-39%]   top-[50%] md:top-[70%] -translate-y-1/2 opacity-50 md:opacity-100 pointer-events-none">
        <Image
          width={2000}
          height={1000}
          src="/images/svg-line.png"
          alt="svg-line"
          placeholder="empty"
          priority
          className="w-full"
        />
      </div>

      {/* Grid 佈局：手機 gap-10，電腦 gap-20 */}
      <div className="relative  grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20">
        {/* 左側：文字區 */}
        {/* 手機板：移除 static z-[99] 限制，增加彈性 */}
        <div className="relative w-full ml-10 z-[99]  flex flex-col justify-center py-4 order-2 md:order-1">
          <motion.div
            key={active}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
          >
            {/* 標題：手機 text-2xl，電腦 text-4xl */}
            <h3 className="text-2xl md:text-4xl w-full font-bold dark:text-white text-black leading-tight">
              {testimonials[active].name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-neutral-500 mt-2">
              {testimonials[active].designation}
            </p>
            <motion.p className="text-base md:text-lg text-gray-500 mt-6 md:mt-8 dark:text-neutral-300">
              {testimonials[active].quote.split(" ").map((word, index) => (
                <motion.span
                  key={index}
                  initial={{ filter: "blur(10px)", opacity: 0, y: 5 }}
                  animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.2,
                    ease: "easeInOut",
                    delay: 0.02 * index,
                  }}
                  className="inline-block break-all whitespace-pre-wrap"
                >
                  {word}&nbsp;
                </motion.span>
              ))}
            </motion.p>
          </motion.div>

          {/* 按鈕：手機板顯示 (移除 hidden)，並調整間距 */}
          <div className="flex gap-4 pt-8 md:pt-12">
            <button
              onClick={handlePrev}
              className="h-10 w-10 md:h-8 md:w-8 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center group/button hover:bg-gray-200 transition-colors"
            >
              <IconArrowLeft className="h-5 w-5 text-black dark:text-neutral-400 group-hover/button:rotate-12 transition-transform duration-300" />
            </button>
            <button
              onClick={handleNext}
              className="h-10 w-10 md:h-8 md:w-8 rounded-full bg-gray-100 dark:bg-neutral-800 flex items-center justify-center group/button hover:bg-gray-200 transition-colors"
            >
              <IconArrowRight className="h-5 w-5 text-black dark:text-neutral-400 group-hover/button:-rotate-12 transition-transform duration-300" />
            </button>
          </div>
        </div>

        {/* 右側：圖片區 (Card) */}
        {/* 手機板：高度設為 h-[320px]，電腦版 h-80 (或更高) */}
        <div
          {...handlers}
          className="relative mb-10  justify-center ml-5  h-[320px] md:h-80 w-full cursor-grab active:cursor-grabbing order-1 md:order-2"
        >
          {/* 裝飾圖片 (Tags) */}
          {decorativeImages.map((img, index) => (
            <motion.div
              key={`${active}-${index}`}
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{
                duration: 0.4,
                delay: 0.2 + index * 0.15,
                type: "spring",
                stiffness: 200,
                damping: 15,
              }}
              className={`absolute z-[1000] pointer-events-none ${img.className}`}
            >
              <Image
                src={img.src}
                alt="tag-decoration"
                width={img.width || 100}
                height={img.height || 100}
                className="object-contain drop-shadow-lg"
              />
            </motion.div>
          ))}

          <AnimatePresence>
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.src}
                initial={{
                  opacity: 0,
                  scale: 0.9,
                  z: -100,
                  rotate: randomRotateY(),
                }}
                animate={{
                  opacity: isActive(index) ? 1 : 0.7,
                  scale: isActive(index) ? 1 : 0.95,
                  z: isActive(index) ? 0 : -100,
                  rotate: isActive(index) ? 0 : randomRotateY(),
                  zIndex: isActive(index)
                    ? 999
                    : testimonials.length + 2 - index,
                  y: isActive(index) ? [0, -80, 0] : 0,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.9,
                  z: 100,
                  rotate: randomRotateY(),
                }}
                transition={{
                  duration: 0.4,
                  ease: "easeInOut",
                }}
                className="absolute inset-0 origin-bottom"
              >
                <Image
                  src={testimonial.src}
                  alt={testimonial.name}
                  width={500}
                  height={700}
                  draggable={false}
                  placeholder="empty"
                  loading="lazy"
                  // 圖片高度：手機板 h-[320px]，電腦版 h-[450px]
                  className="h-[380px] sm:h-[530px] md:h-[450px] xl:h-[550px] xl:w-[85%] w-full rounded-3xl object-cover shadow-xl"
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
