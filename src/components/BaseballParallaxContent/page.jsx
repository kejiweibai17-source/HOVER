"use client";
import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { FiArrowUpRight } from "react-icons/fi";

import Image from "next/image";
import { useInView } from "framer-motion";
import Marquee from "react-fast-marquee";
const TextParallaxContentExample = () => {
  return (
    <div className="!bg-[#171616]">
      <div className="relative">
        <Image
          src="https://www.wdragons.com/wp-content/uploads/2024/03/%E5%A4%A7%E5%B7%A8%E8%9B%8B%E5%AF%A6%E6%8B%8D%E7%85%A7-1.jpg"
          placeholder="empty"
          loading="lazy"
          alt="baseball-event"
          width={1920}
          height={768}
          className="w-full mask-gradient"
        />
        <div className="absolute z-50 max-w-[400px] bottom-5 left-1/2 -translate-x-1/2">
          <h2 className="text-white text-[3rem] font-extrabold">SPORT GAME</h2>
          <div className="info flex  justify-between">
            <span className="text-white text-[.9rem] mx-1">購票資訊</span>
            <span className="text-white text-[.9rem] mx-1">場館周遭</span>
            <span className="text-white text-[.9rem] mx-1">其他資訊</span>
            <span className="text-white text-[.9rem] mx-1">交通</span>
          </div>
        </div>
      </div>
      <div className=" flex flex-row justify-center  items-center mx-auto bg-[#171616]">
        <div className="w-full border-b-[.5px] border-gray-700">
          <div className="flex py-10 px-[80px] w-full flex-row">
            <div className="left w-1/2">
              <div className="txt">
                <span className="text-[12px] text-white font-normal">
                  享受比賽的氛圍
                </span>
                <h2 className="text-[32px] text-white font-normal">
                  台北大巨蛋
                </h2>
                <p className="text-[14px] max-w-[350px] tracking-widest leading-loose mt-4 text-white font-normal">
                  在這座現代化場館中，我們將不再受天候干擾，能夠盡情感受每一球的速度與張力，在封閉空間中釋放無盡的吶喊與熱血！
                </p>
              </div>
            </div>
            <div className="right w-1/2">
              <Image
                src="https://pngimg.com/uploads/baseball/baseball_PNG18991.png"
                placeholder="empty"
                loading="lazy"
                alt="baseball-bat"
                width={1920}
                height={768}
                className="max-w-[900px] rotate-180 mask-gradient"
              />
            </div>
          </div>
        </div>
      </div>

      <TextParallaxContent subheading="Play Ball!!" heading="Enjoy Baseball.">
        <div className="space-y-32 min-h-[300vh] px-8 pt-[8vh] pb-[-500px]">
          <h1 className="text-white text-4xl">HELLO</h1>
          <ExampleContent />
        </div>
      </TextParallaxContent>
      <Marquee className="mt-[-500px]">
        <div className="flex w-full  overflow-hidden flex-row">
          <div>
            <Image
              src="https://www.wdragons.com/wp-content/uploads/2024/03/%E5%A4%A7%E5%B7%A8%E8%9B%8B%E5%9C%96-1.jpg"
              placeholder="empty"
              loading="lazy"
              width={600}
              height={400}
              className="w-full "
              alt="card-image"
            />
          </div>
          <div>
            <Image
              src="https://www.wdragons.com/wp-content/uploads/2024/03/%E5%A4%A7%E5%B7%A8%E8%9B%8B%E5%9C%96-1.jpg"
              placeholder="empty"
              loading="lazy"
              width={600}
              height={400}
              className="w-full "
              alt="card-image"
            />
          </div>
          <div>
            <Image
              src="https://www.wdragons.com/wp-content/uploads/2024/03/%E5%A4%A7%E5%B7%A8%E8%9B%8B%E5%9C%96-1.jpg"
              placeholder="empty"
              loading="lazy"
              width={600}
              height={400}
              className="w-full "
              alt="card-image"
            />
          </div>
          <div>
            <Image
              src="https://www.wdragons.com/wp-content/uploads/2024/03/%E5%A4%A7%E5%B7%A8%E8%9B%8B%E5%9C%96-1.jpg"
              placeholder="empty"
              loading="lazy"
              width={600}
              height={400}
              className="w-full "
              alt="card-image"
            />
          </div>
          <div>
            <Image
              src="https://www.wdragons.com/wp-content/uploads/2024/03/%E5%A4%A7%E5%B7%A8%E8%9B%8B%E5%9C%96-1.jpg"
              placeholder="empty"
              loading="lazy"
              width={600}
              height={400}
              className="w-full "
              alt="card-image"
            />
          </div>
        </div>
      </Marquee>
    </div>
  );
};

const TextParallaxContent = ({ subheading, heading, children }) => {
  const containerRef = useRef(null);
  return (
    <div ref={containerRef} className="relative">
      <div className="sticky top-[-20vh] h-screen z-0 overflow-hidden will-change-transform">
        <StickyBackground containerRef={containerRef} />
        <OverlayCopy
          heading={heading}
          subheading={subheading}
          containerRef={containerRef}
        />
      </div>
      <div className="relative z-10 -mt-[60vh]">{children}</div>
    </div>
  );
};

const StickyBackground = ({ containerRef }) => {
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const rawScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.15]);
  const rawY = useTransform(scrollYProgress, [0, 1], [0, -100]);

  const scale = useSpring(rawScale, { damping: 30, stiffness: 120 });
  const y = useSpring(rawY, { damping: 30, stiffness: 120 });

  return (
    <motion.div
      className="absolute inset-0 bg-[#171616]"
      style={{
        scale,
        y,
        transform: "translateZ(0)",
        willChange: "transform",
      }}
    />
  );
};

const OverlayCopy = ({ subheading, heading, containerRef }) => {
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const rawY = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const rawOpacity = useTransform(
    scrollYProgress,
    [0.15, 0.5, 0.85],
    [0, 1, 0]
  );

  const y = useSpring(rawY, { damping: 30, stiffness: 120 });
  const opacity = useSpring(rawOpacity, { damping: 30, stiffness: 120 });

  return (
    <motion.div
      style={{
        y,
        opacity,
        transform: "translateZ(0)",
        willChange: "transform",
      }}
      className="absolute left-0 top-0 flex h-screen w-full flex-col items-center justify-center text-white px-4"
    >
      <p className="mb-2 text-center text-xl md:mb-4 md:text-3xl">
        {subheading}
      </p>
      <p className="text-center text-4xl font-bold md:text-7xl">{heading}</p>
    </motion.div>
  );
};

const ExampleContent = () => {
  const txtRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: txtRef,
    offset: ["start 0.8", "end 0.2"], // 提前淡入，提前淡出
  });

  const rawOpacity = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    [0, 1, 1, 0]
  );
  const rawY = useTransform(scrollYProgress, [0, 1], [50, -50]);

  const opacity = useSpring(rawOpacity, { damping: 20, stiffness: 100 });
  const y = useSpring(rawY, { damping: 20, stiffness: 100 });

  return (
    <div className="w-[85%] max-w-[1920px] mx-auto">
      <div className="left-card relative h-[120vh] flex flex-row">
        <div className="card absolute top-0 left-[1%] z-30  bg-transparent w-[450px] max-w-[450px] h-[550px] max-h-[500px]">
          <div className="w-full p-4">
            <Image
              src="https://www.wdragons.com/wp-content/uploads/2024/03/%E5%A4%A7%E5%B7%A8%E8%9B%8B%E5%9C%96-1.jpg"
              placeholder="empty"
              loading="lazy"
              width={600}
              height={400}
              className="w-full "
              alt="card-image"
            />
          </div>
        </div>
        <div className="card absolute top-20 right-[1%] z-30  bg-transparent w-[450px] max-w-[450px] h-[550px] max-h-[500px]">
          <div className="w-full p-4">
            <Image
              src="https://www.wdragons.com/wp-content/uploads/2024/03/%E5%A4%A7%E5%B7%A8%E8%9B%8B%E5%9C%96-1.jpg"
              placeholder="empty"
              loading="lazy"
              width={600}
              height={400}
              className="w-full "
              alt="card-image"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
export default TextParallaxContentExample;
