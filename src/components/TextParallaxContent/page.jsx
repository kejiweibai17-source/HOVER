import React, { useRef } from "react";
import { motion, useScroll, useTransform, useSpring } from "framer-motion";
import { FiArrowUpRight } from "react-icons/fi";
import Image from "next/image";
const IMG_PADDING = 12;

const TextParallaxContentExample = () => {
  return (
    <div className="bg-white">
      <TextParallaxContent
        imgUrl="https://www.nissan-nics.co.jp/wp-content/themes/nics2024/assets/images/top/bg-advantage.jpg"
        subheading="Collaborate"
        heading="Built for all of us."
      >
        <div className="space-y-32 min-h-[500vh] px-8 pt-[8vh] pb-32">
          <h1 className="text-white text-4xl">HELLO</h1>
          <ExampleContent />
        </div>
      </TextParallaxContent>
    </div>
  );
};

const TextParallaxContent = ({ imgUrl, subheading, heading, children }) => {
  const containerRef = useRef(null);
  return (
    <div ref={containerRef} className="relative">
      <div className="sticky top-0 h-screen z-0 overflow-hidden will-change-transform">
        <StickyImage imgUrl={imgUrl} containerRef={containerRef} />
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

const StickyImage = ({ imgUrl, containerRef }) => {
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
      className="absolute inset-0 bg-cover bg-center"
      style={{
        backgroundImage: `url(${imgUrl})`,
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
      <p
        className="mb-2 text-center text-xl md:mb-4 md:text-3xl"
        style={{
          WebkitFontSmoothing: "antialiased",
          textRendering: "optimizeLegibility",
        }}
      >
        {subheading}
      </p>
      <p
        className="text-center text-4xl font-bold md:text-7xl"
        style={{
          WebkitFontSmoothing: "antialiased",
          textRendering: "optimizeLegibility",
        }}
      >
        {heading}
      </p>
    </motion.div>
  );
};

const ExampleContent = () => (
  <div className="w-[85%] max-w-[1920px] mx-auto">
    <div className="left-card">
      <div className="card bg-white rounded-[25px] w-[450px] max-w-[450px] h-[550px] max-h-[500px]">
        <div className=" w-full p-4">
          <Image
            src="https://www.nissan-nics.co.jp/wp-content/themes/nics2024/assets/images/top/img-advantage01.avif"
            placeholder="empty"
            loading="lazy"
            width={600}
            height={400}
            className="w-full rounded-[20px]"
            alt="card-image"
          ></Image>
        </div>
      </div>
    </div>
    <div className="right-card flex justify-end">
      <div className="card bg-white rounded-[25px] w-[550px] max-w-[450px] h-[550px] max-h-[500px]">
        <div className="p-4">
          <Image
            src="https://www.nissan-nics.co.jp/wp-content/themes/nics2024/assets/images/top/img-advantage03.avif?1"
            placeholder="empty"
            loading="lazy"
            width={600}
            height={400}
            className="w-full rounded-[20px]"
            alt="card-image "
          ></Image>
        </div>
      </div>
    </div>
    <div className="left-card">
      <div className="card bg-white rounded-[25px] w-[450px] max-w-[450px] h-[550px] max-h-[500px]">
        <div className=" w-full p-4">
          <Image
            src="https://www.nissan-nics.co.jp/wp-content/themes/nics2024/assets/images/top/img-advantage01.avif"
            placeholder="empty"
            loading="lazy"
            width={600}
            height={400}
            className="w-full rounded-[20px]"
            alt="card-image"
          ></Image>
        </div>
      </div>
    </div>
    <div className="right-card flex justify-end">
      <div className="card bg-white rounded-[25px] w-[550px] max-w-[450px] h-[550px] max-h-[500px]">
        <div className="p-4">
          <Image
            src="https://www.nissan-nics.co.jp/wp-content/themes/nics2024/assets/images/top/img-advantage03.avif?1"
            placeholder="empty"
            loading="lazy"
            width={600}
            height={400}
            className="w-full rounded-[20px]"
            alt="card-image "
          ></Image>
        </div>
      </div>
    </div>
  </div>
);

export default TextParallaxContentExample;
