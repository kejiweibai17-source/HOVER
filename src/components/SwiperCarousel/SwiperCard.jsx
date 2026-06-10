"use client";

import { useState } from "react";
import { Pagination, A11y, Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { Card, CardBody } from "@nextui-org/react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedLink from "../AnimatedLink";
import YouTubeHoverPlayer from "../../components/YOutubeEmbed";

import "swiper/css";
import "swiper/css/pagination";

export default function SwiperCardAbout() {
  const [currentIndex, setCurrentIndex] = useState(1);
  const totalSlides = 8;
  const videoIds = [
    "cb2NdZVYjp8",
    "Gc4qO1J_pfE",
    "ww1dUuoFEMY",
    "3FHjCOFHlKk",
    "gTPCpUNXyek",
    "cb2NdZVYjp8",
    "Gc4qO1J_pfE",
    "ww1dUuoFEMY",
    "3FHjCOFHlKk",
    "gTPCpUNXyek",
  ];

  return (
    <div className="py-[100px]">
      {/* 左側：文字區 */}
      <div className="flex justify-start z-[99999999] static w-full pl-50px">
        <div className="txt flex ml-[50px] flex-col">
          {/* 數字顯示在文字下方 */}
          <div className="count-project mt-4 items-center flex">
            <span className="mr-4 text-gray-600 text-[1.2rem]">PROJECT</span>
            <div className="flex items-center gap-1  text-gray-600 text-[1.2rem]">
              <AnimatePresence mode="wait">
                <motion.span
                  key={currentIndex}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.3 }}
                  className=""
                >
                  {currentIndex}
                </motion.span>
              </AnimatePresence>
              <span className="text-[1.2rem]">/ {totalSlides}</span>
            </div>
          </div>
          <div className="flex">
            <h2 className="text-[2.5rem] md:text-[4rem] mt-4 text-[#ffffff] font-normal border-b border-dashed border-black w-fit whitespace-nowrap">
              NIGHT<br></br>MARKET
            </h2>
          </div>
        </div>
      </div>

      {/* 右側：輪播區 */}
      <div className="w-full relative z-10  lg:px-0">
        <div className="w-full lg:px-0">
          <Swiper
            modules={[Pagination, A11y, Autoplay]}
            autoplay={{ delay: 4000, disableOnInteraction: false }}
            loop={true}
            speed={1200}
            spaceBetween={16}
            pagination={{ clickable: true }}
            onSlideChange={(swiper) => {
              setCurrentIndex(((swiper.realIndex ?? 0) % totalSlides) + 1);
            }}
            breakpoints={{
              0: { slidesPerView: 1.2 },
              480: { slidesPerView: 4 },
              640: { slidesPerView: 4 },
              768: { slidesPerView: 4 },
              1024: { slidesPerView: 5.4 },
              1280: { slidesPerView: 5.4 },
            }}
            className="m-0 p-0 !overflow-visible sm:!overflow-hidden"
          >
            {videoIds.map((id, idx) => (
              <SwiperSlide
                key={idx}
                className="mx-2 overflow-hidden group relative duration-1000"
              >
                <div className="relative w-[320px] h-[400px]">
                  <div className="absolute w-full h-full z-30 left-0 top-0">
                    <YouTubeHoverPlayer videoId={id} />
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </div>
    </div>
  );
}
