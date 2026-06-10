"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import styles from "./ScrollAnimation.module.css";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import AnimatedLink from "../AnimatedLink";

gsap.registerPlugin(ScrollTrigger);

const InfiniteScroll = () => {
  const scrollerRef = useRef(null);
  const borderRef = useRef(null);

  useEffect(() => {
    if (!scrollerRef.current || !borderRef.current) return;

    const scroller = scrollerRef.current;
    const sections = scroller.querySelectorAll(`.${styles.section}`);
    const totalWidth = Array.from(sections).reduce(
      (acc, section) => acc + section.offsetWidth,
      0,
    );

    const factor = window.innerWidth < 768 ? 1.5 : 1; // 手機螢幕加長 scroll 區間

    // 1. 原本的橫向滾動動畫
    const animation = gsap.to(scroller, {
      x: () => `-${totalWidth - window.innerWidth}px`,
      ease: "none",
      scrollTrigger: {
        trigger: scroller,
        start: "top top",
        end: () => `+=${totalWidth * factor}`,
        pin: true,
        scrub: 1,
        onEnter: () => {
          gsap.to(borderRef.current, {
            opacity: 1,
            borderWidth: "23px",
            duration: 0.3,
          });
        },
        onLeave: () => {
          gsap.to(borderRef.current, { opacity: 0, duration: 0.5 });
        },
        onEnterBack: () => {
          gsap.to(borderRef.current, {
            opacity: 1,
            borderWidth: "23px",
            duration: 0.3,
          });
        },
        onLeaveBack: () => {
          gsap.to(borderRef.current, { opacity: 0, duration: 0.5 });
        },
      },
    });

    // 2. ✨ 新增：為上層小圖加入滾動時的浮動/視差效果 (Parallax)
    const floaters = scroller.querySelectorAll(".float-element");
    const floatTriggers = []; // 用來儲存 trigger 以便 cleanup

    floaters.forEach((floater, index) => {
      // 根據 index 給予不同的位移量，製造不規則的浮動層次感
      const yOffset = index % 2 === 0 ? -60 : 40;
      const xOffset = index % 2 === 0 ? 30 : -30;

      const floatAnim = gsap.to(floater, {
        y: yOffset,
        x: xOffset,
        ease: "none",
        scrollTrigger: {
          trigger: scroller,
          start: "top top",
          end: () => `+=${totalWidth * factor}`,
          scrub: 1, // scrub: 1 讓浮動效果柔和地跟隨滾動進度
        },
      });
      floatTriggers.push(floatAnim.scrollTrigger);
    });

    return () => {
      animation.scrollTrigger?.kill();
      floatTriggers.forEach((trigger) => trigger?.kill());
    };
  }, []);

  return (
    <div className={styles.container}>
      {/* 黑色邊框＋四邊跑馬燈文字 */}
      <div ref={borderRef} className={styles.borderFrame}>
        <div className={`${styles.marquee} ${styles.top}`}>
          <span> UFLOW HEALTH & LIFESTYLE • ENJOY HEALTHY LIFE </span>
        </div>
        <div className={`${styles.marquee} ${styles.right}`}>
          <span>• ELEVATE YOUR WELLNESS • UFLOW HEALTH </span>
        </div>
        <div className={`${styles.marquee} ${styles.bottom}`}>
          <span>LIFESTYLE • ENJOY HEALTHY LIFE • ELEVATE YOUR WELLNESS • </span>
        </div>
        <div className={`${styles.marquee} ${styles.left}`}>
          <span> UFLOW HEALTH & LIFESTYLE • ENJOY HEALTHY LIFE </span>
        </div>
      </div>

      {/* 水平滾動區域 */}
      <div className={styles.horizontalScroller} ref={scrollerRef}>
        {/* Section 1 */}
        {/* 覆蓋原本的 100vw，將寬度縮減為 45vw (可依需求微調數值) */}

        {/* Section 2 */}
        {/* ✨ 改為 CSS Background Image 設定，確保填滿整個 section */}
        <section
          className={`${styles.section} relative w-[250vw] bg-[url('/images/植物01.png')] bg-cover bg-center bg-repeat`}
        >
          {/* ✨ 加上 float-element 類別，讓 GSAP 抓取並執行動畫 */}
          <div className="float-element man-01 absolute left-[10%] z-10 bottom-0">
            <div className="relative group">
              <div className="chat-box absolute  border border-white z-10 top-[-30%] right-[-10%]">
                <Image
                  src="/images/DSCF7894.jpg"
                  placeholder="empty"
                  alt="qa-icon-01"
                  width={400}
                  height={550}
                  className="w-[310px]  group-hover:scale-105 duration-500"
                />
              </div>
            </div>
          </div>
          <div className="float-element man-01 absolute left-[34%] z-10 bottom-[15%]">
            <div className="relative group">
              <div className="img ">
                <Image
                  src="/images/DSCF7774.jpg"
                  placeholder="empty"
                  alt="man-01"
                  width={400}
                  height={550}
                  className="w-[400px] group-hover:scale-105 duration-500 group-hover:shadow-xl"
                />
              </div>
            </div>
          </div>
          <div className="float-element man-02 absolute left-[24%] z-10 bottom-[20%]">
            <AnimatedLink href="project">
              <div className="relative group">
                <div className="img">
                  <Image
                    src="/images/DSCF7850.jpg"
                    placeholder="empty"
                    alt="man-02"
                    width={400}
                    height={550}
                    className="w-[340px] group-hover:scale-105 duration-500 group-hover:shadow-xl"
                  />
                </div>
                <div className="chat-box absolute z-10 top-[-15%] right-[-20%]">
                  <Image
                    src="/images/DSCF7850.jpg"
                    placeholder="empty"
                    alt="qa-icon-02"
                    width={400}
                    height={550}
                    className="w-[110px] group-hover:scale-105 duration-500"
                  />
                </div>
              </div>
            </AnimatedLink>
          </div>

          <div className="float-element man-02 absolute right-[31%] z-10 bottom-[30%]">
            <div className="relative group">
              <div className="img">
                <Image
                  src="/images/DSCF7853.jpg"
                  placeholder="empty"
                  alt="women-01"
                  width={400}
                  height={550}
                  className="w-[430px] group-hover:scale-105 duration-500 group-hover:shadow-xl"
                />
              </div>
            </div>
          </div>

          <div className="float-element man-02 absolute top-[9%] left-[8%] z-10">
            <div className="relative group">
              <div className="img">
                <Image
                  src="/images/DSCF7878.jpg"
                  placeholder="empty"
                  alt="growth-9"
                  width={400}
                  height={550}
                  className="w-[330px] group-hover:scale-105 duration-500 group-hover:shadow-xl"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default InfiniteScroll;
