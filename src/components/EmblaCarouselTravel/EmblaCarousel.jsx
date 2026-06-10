import React, { useCallback, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import {
  NextButton,
  PrevButton,
  usePrevNextButtons,
} from "./EmblaCarouselArrowButtons";
import { DotButton, useDotButton } from "./EmblaCarosuelDotButton";
import { gsap } from "gsap";
import Image from "next/image";

const EmblaCarousel = (props) => {
  const { slides, options } = props;
  const [emblaRef, emblaApi] = useEmblaCarousel(options);
  const dragIndicatorRef = useRef(null);

  const { selectedIndex, scrollSnaps, onDotButtonClick } =
    useDotButton(emblaApi);
  const {
    prevBtnDisabled,
    nextBtnDisabled,
    onPrevButtonClick,
    onNextButtonClick,
  } = usePrevNextButtons(emblaApi);

  const handleMouseEnter = () => {
    gsap.to(dragIndicatorRef.current, { opacity: 1, scale: 1, duration: 0.5 });
    document.body.style.cursor = "grab";
  };

  const handleMouseLeave = () => {
    gsap.to(dragIndicatorRef.current, {
      opacity: 0,
      scale: 0.5,
      duration: 0.5,
    });
    document.body.style.cursor = "default";
  };

  useEffect(() => {
    if (!emblaApi) return;

    emblaApi
      .on("reInit", () => {})
      .on("scroll", () => {})
      .on("slideFocus", () => {});
  }, [emblaApi]);

  return (
    <div
      className="relative w-full py-6 sm:py-8 mx-auto max-w-6xl px-3 sm:px-4 lg:px-6"
      style={{
        // default slide config
        "--slide-height": "19rem",
        "--slide-spacing": "1rem",
        "--slide-size": "26%",
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 針對 slide-size 的 RWD 微調，保留你原本的設計邏輯 */}
      <style>
        {`
          @media (max-width: 1700px) {
            .embla__viewport {
              --slide-size: 32%;
            }
          }
          @media (max-width: 1000px) {
            .embla__viewport {
              --slide-size: 40%;
            }
          }
          @media (max-width: 768px) {
            .embla__viewport {
              --slide-size: 70%;
            }
          }
          @media (max-width: 550px) {
            .embla__viewport {
              --slide-size: 80%;
            }
          }
        `}
      </style>

      {/* Embla viewport */}
      <div className="embla__viewport w-full" ref={emblaRef}>
        <div
          className="embla__container flex touch-pan-y touch-pinch-zoom h-auto"
          style={{ marginLeft: "calc(var(--slide-spacing) * -1)" }}
        >
          {slides.map((slide, index) => (
            <div
              className="embla__slide relative transform flex-none h-full min-w-0"
              key={index}
              style={{
                transform: "translate3d(0, 0, 0)",
                flex: "0 0 var(--slide-size)",
                paddingLeft: "var(--slide-spacing)",
              }}
            >
              {/* 下方 ▼ 圓形按鈕：保留設計，尺寸做 RWD */}
              <div className="bottom-btn absolute z-30 -bottom-6 sm:bottom-[-20px] left-1/2 -translate-x-1/2">
                <div className="bg-[#333] w-10 h-10 sm:w-[50px] sm:h-[50px] rounded-full flex justify-center items-center text-white text-xs sm:text-sm">
                  ▼
                </div>
              </div>

              {/* 卡片本體 */}
              <div
                className="embla__slide__number bg-white pt-4 sm:pt-0 pb-10 flex flex-col items-center justify-center"
                style={{
                  boxShadow: "inset 0 0 0 0.2rem var(--detail-medium-contrast)",
                  height: "100%",
                  userSelect: "none",
                }}
              >
                <a href="/" className="block w-full h-full">
                  <div className="flex flex-col justify-center items-center px-4 py-3 sm:px-6 sm:py-4">
                    {/* 卡片標題上方小文字 */}
                    <div className="mb-2 sm:mb-3">
                      <span className="card-title text-[0.95rem] sm:text-[1.05rem] lg:text-[1.2rem]">
                        Product-Name
                      </span>
                    </div>

                    {/* 圖片 / 自訂內容 */}
                    {slide.content ? (
                      slide.content
                    ) : (
                      <div className="w-full flex justify-center">
                        <Image
                          width={1800}
                          height={800}
                          placeholder="empty"
                          loading="lazy"
                          src={slide.image}
                          className="w-[70%] sm:w-[75%] max-w-[230px] mx-auto"
                          alt={`Slide ${index + 1}`}
                        />
                      </div>
                    )}

                    {/* 文字說明 */}
                    <div className="txt mt-4 sm:mt-5 flex flex-col justify-center items-center w-4/5 mx-auto">
                      <b className="text-base sm:text-[1.05rem] text-center leading-snug">
                        {slide.title}
                      </b>
                      <p className="mt-2 text-xs sm:text-sm font-normal text-center leading-relaxed text-gray-700">
                        {slide.description}
                      </p>
                    </div>
                  </div>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 控制區：左右箭頭 + dots */}
      <div className="embla__controls mt-6 sm:mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* <div className="embla__buttons flex justify-center sm:justify-start gap-3">
          <PrevButton onClick={onPrevButtonClick} disabled={prevBtnDisabled} />
          <NextButton onClick={onNextButtonClick} disabled={nextBtnDisabled} />
        </div> */}

        <div className="embla__dots flex flex-wrap justify-center sm:justify-end gap-2">
          {scrollSnaps.map((_, index) => (
            <DotButton
              key={index}
              onClick={() => onDotButtonClick(index)}
              className={"embla__dot".concat(
                index === selectedIndex ? " embla__dot--selected" : ""
              )}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default EmblaCarousel;
