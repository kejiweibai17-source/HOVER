"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

function CarouselArrows({ onPrev, onNext }) {
  const btnClass =
    "absolute top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center border border-[#ddd] bg-white text-black shadow-sm transition-colors hover:bg-[#f5f5f5]";

  return (
    <>
      <button
        type="button"
        aria-label="上一組"
        onClick={onPrev}
        className={`${btnClass} left-2 md:left-4`}
      >
        <ChevronLeft size={20} strokeWidth={1.5} />
      </button>
      <button
        type="button"
        aria-label="下一組"
        onClick={onNext}
        className={`${btnClass} right-2 md:right-4`}
      >
        <ChevronRight size={20} strokeWidth={1.5} />
      </button>
    </>
  );
}

export default function InfiniteCarousel({
  title,
  titleClassName = "mb-6 text-[15px] font-semibold tracking-[0.12em] text-black",
  items = [],
  renderItem,
  visibleMd = 4,
  visibleSm = 2,
  className = "",
  headerClassName = "",
  trackClassName = "",
  slideClassName = "px-2 md:px-3",
}) {
  const baseLength = items.length;
  const [visible, setVisible] = useState(visibleMd);
  const [index, setIndex] = useState(baseLength);
  const [animate, setAnimate] = useState(true);

  const loopItems = useMemo(() => {
    if (!baseLength) return [];
    const tripled = [...items, ...items, ...items];
    return tripled.map((item, i) => ({
      ...item,
      _carouselKey: `${item.id ?? item.src ?? "item"}-loop-${i}`,
    }));
  }, [items, baseLength]);

  useEffect(() => {
    setIndex(baseLength);
  }, [baseLength]);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setVisible(mq.matches ? visibleMd : visibleSm);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [visibleMd, visibleSm]);

  const go = useCallback(
    (delta) => {
      if (!baseLength) return;
      setAnimate(true);
      setIndex((prev) => prev + delta);
    },
    [baseLength],
  );

  useEffect(() => {
    if (!baseLength) return;

    const timer = window.setTimeout(() => {
      if (index >= baseLength * 2) {
        setAnimate(false);
        setIndex(baseLength);
      } else if (index < baseLength) {
        setAnimate(false);
        setIndex(baseLength * 2 - 1);
      }
    }, 320);

    return () => window.clearTimeout(timer);
  }, [index, baseLength]);

  if (!baseLength) return null;

  const innerWidthPercent = (loopItems.length / visible) * 100;
  const slideWidthPercent = 100 / loopItems.length;
  const translatePercent = index * slideWidthPercent;

  return (
    <section className={`relative bg-white ${className}`}>
      {title ? (
        <div className={headerClassName || "px-10 pt-12 md:px-16"}>
          <h2 className={titleClassName}>{title}</h2>
        </div>
      ) : null}

      <div className={`relative ${title ? "pb-12" : "py-12"} px-10 md:px-16`}>
        <CarouselArrows onPrev={() => go(-1)} onNext={() => go(1)} />

        <div className={`overflow-hidden ${trackClassName}`}>
          <div
            className={`flex ${animate ? "transition-transform duration-300 ease-out" : ""}`}
            style={{
              width: `${innerWidthPercent}%`,
              transform: `translateX(-${translatePercent}%)`,
            }}
          >
            {loopItems.map((item, i) => (
              <div
                key={item._carouselKey}
                style={{ width: `${slideWidthPercent}%` }}
                className={`shrink-0 ${slideClassName}`}
              >
                {renderItem(item, i % baseLength)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
