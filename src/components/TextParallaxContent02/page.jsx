"use client";

import React, { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useMotionTemplate,
} from "framer-motion";
import Image from "next/image";
import ParallaxImage from "../ParallaxImage";
import Marquee from "react-fast-marquee";

const TextParallaxContentExample = () => {
  const sectionRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });

  // 圖片放大 + 上移
  const scale = useSpring(
    useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.4, 1.2]),
    { stiffness: 100, damping: 20 },
  );
  const yImg = useSpring(useTransform(scrollYProgress, [0, 1], [0, -150]), {
    stiffness: 100,
    damping: 20,
  });
  const imgOpacity = useSpring(
    useTransform(scrollYProgress, [0, 0.05, 0.85, 1], [0.6, 1, 1, 0.85]),
    { stiffness: 80, damping: 16 },
  );

  // blur
  const blurValue = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    ["6px", "0px", "2px"],
  );
  const blurFilter = useMotionTemplate`blur(${blurValue})`;

  // 左右文字滑入 + 淡入
  const leftX = useSpring(
    useTransform(
      scrollYProgress,
      [0, 0.25, 0.75, 1],
      ["-160%", "0%", "0%", "-160%"],
    ),
    { stiffness: 120, damping: 22 },
  );
  const rightX = useSpring(
    useTransform(
      scrollYProgress,
      [0, 0.25, 0.75, 1],
      ["160%", "0%", "0%", "160%"],
    ),
    { stiffness: 120, damping: 22 },
  );
  const textOpacity = useSpring(
    useTransform(scrollYProgress, [0.1, 0.3, 0.8, 0.95], [0, 1, 1, 0]),
    { stiffness: 100, damping: 20 },
  );

  return (
    <>
      {/* ✅ isolate：避免 transform 影響 Navbar / Dropdown */}
      <div className="bg-white relative isolate">
        {/* 第一段：產品 + 文案 */}
        {/* 第一段：產品 + 文案 (已修復 RWD 並改用背景圖) */}
        <section
          // ✨ 改用 CSS 背景圖片，設定 cover 與 center
          className="relative w-full   mt-20 overflow-hidden flex flex-col justify-center items-center bg-[url('/images/三種02.png')] bg-cover bg-[center_center] md:bg-[center_top] lg:bg-center bg-no-repeat"
        >
          {/* ✨ 新增：手機版專用黑色半透明遮罩，提升文字可讀性，電腦版隱藏 */}
          <div className="absolute inset-0 bg-black/60 lg:hidden z-0"></div>

          {/* 文字內容區塊 */}
          {/* ✨ RWD 修復重點：
      1. 手機版 relative + flex center + padding，讓內容自然撐開
      2. 電腦版恢復 absolute 定位靠右
      3. w-full max-w-[550px] 確保小螢幕不破版
  */}
          <div className="txt relative z-10 w-full px-6 py-16 flex flex-col justify-center items-center lg:absolute lg:right-[5%] lg:top-1/2 lg:-translate-y-1/2 lg:items-start lg:max-w-[550px] lg:p-0">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-50 text-center lg:text-left drop-shadow-lg">
              GABA 鎂鎂香蜂草
            </h2>
            <div className="mt-5 text-center lg:text-left">
              <h3 className="text-lg sm:text-xl lg:text-2xl text-stone-50 font-normal my-2 drop-shadow-md">
                舒壓好眠．能量循環的科學新方
              </h3>
              <h3 className="text-lg sm:text-xl lg:text-2xl text-stone-50 font-normal my-2 drop-shadow-md">
                專利GABA x 速可包覆鎂 x 法國香蜂草
              </h3>
            </div>
            <p className="leading-relaxed text-stone-50 tracking-wider mt-4  !text-left t lg:text-left text-sm sm:text-base drop-shadow-sm">
              針對生活步調緊湊、壓力大與睡眠品質不佳的現代人設計 。嚴選韓國專利
              GABAEX® (500mg) 作為情緒煞車，搭配義大利 SideMag® 速可包覆鎂
              (200mg)，利用 Sucrosomial® 專利技術提升吸收率達 300%
              。加上法國香蜂草萃取，以黃金三角配方，幫助您日間提振精神、夜間放鬆入眠。
            </p>

            {/* ✨ RWD 修復重點：
        移除 mr-10，改用 flex-wrap 和 gap-x-8 gap-y-4
        確保螢幕變窄時自動換行，不會有橫向卷軸
    */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-x-8 gap-y-6 py-8 w-full">
              <div className="flex flex-col items-center">
                <Image
                  src="https://coralclub.ru/rcp/templates/promarine-collagen-tripeptides/assets/best-product-first-ByYP-jMQ.svg"
                  alt="純天然成分"
                  width={80}
                  height={80}
                  className="w-[60px] h-[60px] lg:w-[70px] lg:h-[70px]"
                  placeholder="empty"
                  loading="lazy"
                />
                <b className="mt-3 text-stone-50 text-sm lg:text-base drop-shadow-md">
                  純天然成分
                </b>
              </div>
              <div className="flex flex-col items-center">
                <Image
                  src="https://coralclub.ru/rcp/templates/promarine-collagen-tripeptides/assets/best-product-second-DFPnTpt2.svg"
                  alt="純天然成分"
                  width={80}
                  height={80}
                  className="w-[60px] h-[60px] lg:w-[70px] lg:h-[70px]"
                  placeholder="empty"
                  loading="lazy"
                />
                <b className="mt-3 text-stone-50 text-sm lg:text-base drop-shadow-md">
                  純天然成分
                </b>
              </div>
              <div data-aos="fadeUp" className="flex flex-col items-center">
                <Image
                  src="https://coralclub.ru/rcp/templates/promarine-collagen-tripeptides/assets/best-product-third-BBToOs3r.svg"
                  alt="純天然成分"
                  width={80}
                  height={80}
                  className="w-[60px] h-[60px] lg:w-[70px] lg:h-[70px]"
                  placeholder="empty"
                  loading="lazy"
                />
                <b className="mt-3 text-stone-50 text-sm lg:text-base drop-shadow-md">
                  純天然成分
                </b>
              </div>
            </div>

            <div className="h-[2px] bg-[#ebebeb]/50 w-full rounded-full" />

            {/* ✨ RWD 修復重點：
        改為 flex-col 上下排列，並允許文字換行，解決文字被切斷的問題
    */}
            <div className="flex flex-col sm:flex-row justify-between mt-3 gap-2 w-full text-center lg:text-left">
              <span className="text-[13px] text-stone-50 tracking-widest drop-shadow-sm whitespace-normal">
                經過國家級的驗證，專業醫生的背書
              </span>
              <span className="text-[13px] text-stone-50 tracking-widest drop-shadow-sm whitespace-normal hidden sm:block">
                經過國家級的驗證，專業醫生的背書
              </span>
            </div>
          </div>
        </section>
        {/* 第二段：左右圖文 */}
        <section className="w-full bg-[#f9f9f9] py-12 lg:py-24">
          {/* 限制最大寬度並居中，確保在大螢幕上不失真 */}
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            {/* Flex 容器：手機版垂直排列 (col-reverse 讓圖片在手機上先顯示)，桌機版左右並排 */}
            <div className="flex flex-col-reverse lg:flex-row lg:items-start lg:gap-16">
              {/* ----- 左側：文字內容區域 ----- */}
              <div className="flex flex-col w-full lg:w-1/2 space-y-16 pt-8 lg:pt-0">
                {/* Header */}
                <div className="space-y-4">
                  <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900">
                    維他菌合生元
                  </h1>

                  <p className="text-xl font-medium text-stone-700">
                    益生菌 x 益生元 x 後生元 (益萃質®)
                  </p>
                </div>

                {/* Content Block 1 */}
                <div className="space-y-4    ">
                  <h3 className="text-2xl font-bold text-slate-800">
                    建構腸道「黃金三角」，開啟消化環保新紀元
                  </h3>
                  <p className="text-lg leading-relaxed text-stone-700">
                    超越傳統益生菌的單一補充，我們採用現代腸道保健的頂級規格——
                    <span className="font-bold text-slate-800">
                      「合生元 (Synbiotics) 搭配後生元 (Postbiotics)」
                    </span>
                    的黃金三角配方。這套系統性的保養邏輯，不僅提供「活的益菌」作為種子，更足量添加「益菌的食物」如難消化性麥芽糊精與異麥芽寡醣。
                    結合新一代後生元，實現「先顧、再補、後養」的全方位循環。
                  </p>
                </div>

                {/* Content Block 2 */}
                <div className="space-y-4    ">
                  <h3 className="text-2xl font-bold text-slate-800">
                    嚴選 4 大專利機能菌 x Totipro® 益萃質
                  </h3>
                  <p className="text-lg leading-relaxed text-stone-700">
                    嚴選適合亞洲人體質的 4 大專利機能益菌：
                    <span className="font-bold text-blue-900">
                      CP-9、F-1、LPL-28 與 AP-32
                    </span>
                    。 這些菌株均經過業界最高標準的連續式酸性與膽鹽環境測試。
                    特別添加專利 Totipro® 益萃質®
                    ，經實驗證實能有效全面提升消化道表皮組織的屏障力，從根本打造健康的細菌叢生態。
                  </p>
                </div>

                {/* Content Block 3 */}
                <div className="space-y-4    ">
                  <h3 className="text-2xl font-bold text-slate-800">
                    漢方智慧加持，溫和調理的舒暢哲學
                  </h3>
                  <p className="text-lg leading-relaxed text-stone-700">
                    獨家融入傳統漢方智慧，特別添加
                    <span className="font-bold text-green-800">
                      山藥、山楂與牛蒡
                    </span>
                    三種溫和草本精華。這種「中西合璧」的配方設計，不僅能緩解生活壓力帶來的消化不適，更能溫和地滋養身體，是適合全家大小的日常保養首選。
                  </p>
                </div>
              </div>

              {/* ----- 右側：圖片區域 (Sticky) ----- */}
              {/* lg:sticky lg:top-10 讓圖片在桌機版捲動時會固定住 */}
              <div className="w-full lg:w-1/2 lg:sticky lg:top-24 lg:h-screen">
                <div className="relative flex justify-center items-center w-full aspect-square lg:aspect-auto lg:h-[600px]">
                  {/* 背景裝飾圖 (旋轉的那張) */}

                  {/* 主產品圖 */}
                  <div className="absolute z-10 w-[90%] max-w-[600px] drop-shadow-2xl">
                    <Image
                      src="/images/維他菌-合生元.png"
                      alt="維他菌合生元產品圖"
                      width={800}
                      height={800}
                      className="w-full h-auto object-contain"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 第三段：sticky parallax（這裡也加 isolate） */}
        <section
          ref={sectionRef}
          className="relative  pt-[300px] bg-white isolate"
        >
          <div className="sticky top-0 h-screen overflow-hidden">
            {/* 圖片層 */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                scale,
                y: yImg,
              }}
            >
              <Image
                src="/images/DSCF7681.png"
                alt="天然成分示意"
                width={1400}
                height={900}
                priority
                className="w-[25vw] max-w-[360px] min-w-[320px] h-auto  "
              />
            </motion.div>

            {/* 文字層 */}
            <div className="absolute inset-0 flex items-center justify-between px-[6vw]">
              <motion.h2
                style={{ x: leftX, opacity: textOpacity }}
                className="text-[clamp(24px,4vw,54px)] font-extrabold text-neutral-800 whitespace-nowrap select-none"
              >
                <div className="text-outline-shadow text-6xl font-sans tracking-[2px] uppercase">
                  UFLOW
                </div>
                是身體的指揮家
                <div className="w-full overflow-hidden  max-w-[220px] lg:max-w-[450px] mt-4">
                  <Marquee>
                    <div className="flex justify-center items-center w-full overflow-hidden">
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <div
                          key={idx}
                          className="mx-2 flex justify-center items-center w-[8%] xl:w-[20%]"
                        >
                          <Image
                            src="https://coralclub.ru/images/labels/icon-gluten-free.svg"
                            alt=""
                            placeholder="empty"
                            loading="lazy"
                            width={200}
                            height={200}
                            className="max-w-[100px]"
                          />
                          <span className="text-base ml-2 mlr-4">
                            純天然的成分
                          </span>
                        </div>
                      ))}
                    </div>
                  </Marquee>
                </div>
              </motion.h2>

              <motion.h2
                style={{ x: rightX, opacity: textOpacity }}
                className="text-[clamp(24px,4vw,54px)] font-extrabold text-neutral-800 whitespace-nowrap select-none max-w-[520px]"
              >
                「UFLOW」
                <br />
                <div className="text-[14px] mt-4 text-wrap font-normal">
                  的名字代表著：U (You) + Flow (流動)。
                </div>
              </motion.h2>
            </div>

            {/* 背景漸層 */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/60 via-transparent to-white/70" />
          </div>
        </section>

        {/* 最後一段 TextParallaxContent */}
        <TextParallaxContent
          subheading="晶透煥亮．喚回芙蓉貴婦肌"
          heading="肽晶芙蓉"
        >
          <div className="space-y-32 min-h-[180vh] px-8 pt-[8vh] pb-32">
            <h1 className="text-white text-4xl" />
            <ExampleContent />
          </div>
        </TextParallaxContent>
      </div>
    </>
  );
};

/* ===== TextParallaxContent wrapper ===== */
const TextParallaxContent = ({ subheading, heading, children }) => {
  const containerRef = useRef(null);
  return (
    <div ref={containerRef} className="relative isolate">
      <div className="sticky top-0 h-screen z-0 overflow-hidden will-change-transform">
        <StickyBackground containerRef={containerRef} />
        <OverlayCopy
          heading={heading}
          subheading={subheading}
          containerRef={containerRef}
        />
      </div>
      <div className="relative z-10">{children}</div>
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
      className="absolute inset-0 bg-[url('/images/肽晶芙蓉.png')] bg-center bg-cover bg-no-repeat"
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
    [0, 1, 0],
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
      className="absolute left-0 top-0 flex h-screen w-full flex-col items中心 justify-center text-white px-4"
    >
      <p className="mb-2 text-center text-xl md:mb-4 md:text-3xl">
        {subheading}
      </p>
      <p className="text-center text-4xl font-bold md:text-7xl">{heading}</p>
    </motion.div>
  );
};

/* ===== ExampleContent 區塊 ===== */
const ExampleContent = () => {
  const txtRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: txtRef,
    offset: ["start 0.8", "end 0.2"],
  });

  const rawOpacity = useTransform(
    scrollYProgress,
    [0, 0.3, 0.7, 1],
    [0, 1, 1, 0],
  );
  const rawY = useTransform(scrollYProgress, [0, 1], [50, -50]);

  const opacity = useSpring(rawOpacity, { damping: 20, stiffness: 100 });
  const y = useSpring(rawY, { damping: 20, stiffness: 100 });

  return (
    <motion.div
      ref={txtRef}
      style={{ opacity, y }}
      className="w-[85%] flex flex-row max-w-[1920px] mx-auto"
    >
      {/* 外層容器：手機版垂直排列，電腦版並排且固定高度 */}
      <div className="w-full flex flex-col lg:flex-row relative lg:h-[120vh]">
        {/* Left Column */}
        <div className="left-card w-full lg:w-1/2 relative flex flex-col items-center gap-8 lg:gap-0 lg:block lg:h-full">
          {/* Card 1: 晶透源頭 */}
          {/* 手機版 relative + flex center / 電腦版 absolute 定位 */}
          <div className="card-wrap relative w-full flex justify-center lg:absolute lg:z-20 lg:top-[5%] lg:left-[10%] lg:w-auto lg:block">
            <div className="card bg-white  flex flex-col items-center w-[90%] max-w-[400px] lg:w-[450px] h-auto min-h-[450px] p-6 lg:p-8  duration-300 border border-gray-100">
              <div className="w-full mb-4">
                <Image
                  src="/images/about/晶透源頭：LiposoMax微脂體穀胱甘肽.png"
                  placeholder="empty"
                  loading="lazy"
                  width={600}
                  height={400}
                  className="w-full h-auto object-contain"
                  alt="LiposoMax® 微脂體穀胱甘肽"
                />
              </div>
              <div className="flex flex-col justify-center items-center w-full space-y-3 text-center">
                <h3 className="text-lg lg:text-xl font-bold leading-snug">
                  晶透源頭：LiposoMax® <br className="hidden lg:block" />
                  微脂體穀胱甘肽
                </h3>
                <p className="text-gray-600 text-sm lg:text-[15px] leading-relaxed  !text-left t lg:text-center">
                  採用美國專利微脂體技術，突破吸收極限， <br></br>
                  讓高濃度穀胱甘肽直達肌底，
                  <br></br>由內而外綻放極致透亮光采。
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: 隱形防護 */}
          <div className="card-wrap relative w-full flex justify-center lg:absolute lg:z-20 lg:top-[55%] lg:left-[5%] lg:w-auto lg:block">
            <div className="card bg-white  flex flex-col items-center w-[90%] max-w-[400px] lg:w-[450px] h-auto min-h-[450px] p-6 lg:p-8  duration-300 border border-gray-100">
              <div className="w-full mb-4">
                <Image
                  src="/images/about/日本冰晶番茄 嚴選日本專利冰晶番茄.png"
                  placeholder="empty"
                  loading="lazy"
                  width={600}
                  height={400}
                  className="w-full h-auto object-contain"
                  alt="Phytonoid® 日本冰晶番茄"
                />
              </div>
              <div className="flex flex-col justify-center items-center w-full space-y-3 text-center">
                <h3 className="text-lg lg:text-xl font-bold leading-snug">
                  隱形防護：Phytonoid® <br className="hidden lg:block" />
                  日本冰晶番茄
                </h3>
                <p className="text-gray-600 !text-left text-sm lg:text-[15px] leading-relaxed   lg:text-center">
                  嚴選日本專利冰晶番茄，富含珍稀植萃能量，
                  <br></br> 有效抵禦外在光線刺激，<br></br>
                  為肌膚撐起全天候的隱形防護傘。
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="right-card w-full lg:w-1/2 relative flex flex-col items-center gap-8 lg:gap-0 mt-8 lg:mt-0 lg:block lg:h-full">
          {/* Card 3: 彈力支撐 */}
          <div className="card-wrap relative w-full flex justify-center lg:absolute lg:z-20 lg:top-[-5%] lg:right-[5%] lg:w-auto lg:block">
            <div className="card bg-white  flex flex-col items-center w-[90%] max-w-[400px] lg:w-[450px] h-auto min-h-[450px] p-6 lg:p-8  duration-300 border border-gray-100">
              <div className="w-full mb-4">
                <Image
                  src="/images/about/彈力支撐：Mesoporosil® 比利時正矽酸.png"
                  placeholder="empty"
                  loading="lazy"
                  width={600}
                  height={400}
                  className="w-full h-auto object-contain"
                  alt="Mesoporosil® 美適矽正矽酸"
                />
              </div>
              <div className="flex flex-col justify-center items-center w-full space-y-3 text-center">
                <h3 className="text-lg lg:text-xl font-bold leading-snug">
                  彈力支撐：Mesoporosil® <br className="hidden lg:block" />
                  美適矽正矽酸
                </h3>
                <p className="text-gray-600 text-sm lg:text-[15px] leading-relaxed  !text-left t lg:text-center">
                  比利時專利正矽酸複合物， <br></br>能穩固膠原蛋白結構，{" "}
                  <br></br>
                  精準支撐肌底彈力網， <br></br>重現青春必備的緊緻與澎潤感。
                </p>
              </div>
            </div>
          </div>

          {/* Card 4: 抗氧封存 */}
          <div className="card-wrap relative w-full flex justify-center mb-10 lg:mb-0 lg:absolute lg:z-20 lg:bottom-[10%] lg:right-[10%] lg:w-auto lg:block">
            <div className="card bg-white  flex flex-col items-center w-[90%] max-w-[400px] lg:w-[450px] h-auto min-h-[450px] p-6 lg:p-8  duration-300 border border-gray-100">
              <div className="w-full mb-4">
                <Image
                  src="/images/about/抗氧封存：PUREWAY-C® 複方維生素 C.png"
                  placeholder="empty"
                  loading="lazy"
                  width={600}
                  height={400}
                  className="w-full h-auto object-contain"
                  alt="PUREWAY-C® 複方維生素 C"
                />
              </div>
              <div className="flex flex-col justify-center items-center w-full space-y-3 text-center">
                <h3 className="text-lg lg:text-xl font-bold leading-snug">
                  抗氧封存：PUREWAY-C® <br className="hidden lg:block" />
                  複方維生素 C
                </h3>
                <p className="text-gray-600 text-sm lg:text-[15px] leading-relaxed  !text-left t lg:text-center">
                  結合美國複方維生素 C， <br></br>以卓越抗氧化力進行協同作用，{" "}
                  <br></br>
                  全方位喚回肌膚 <br></br>彈、緊、嫩，打造無瑕芙蓉貴婦肌。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default TextParallaxContentExample;
