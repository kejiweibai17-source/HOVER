"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MOBILE_MQ = "(max-width: 767px)";
const SWIPE_THRESHOLD = 48;

function CarouselArrows({ onPrev, onNext, imageAspectRatio, visible }) {
  const btnClass =
    "absolute top-1/2 z-10 flex -translate-y-1/2 items-center justify-center text-black transition-opacity hover:opacity-50";

  if (imageAspectRatio && visible > 0) {
    const slideWidth = `${100 / visible}%`;

    return (
      <>
        <div
          className="pointer-events-none absolute left-0 top-0 z-10"
          style={{ width: slideWidth, aspectRatio: imageAspectRatio }}
        >
          <button
            type="button"
            aria-label="上一組"
            onClick={onPrev}
            className={`${btnClass} pointer-events-auto left-2 md:left-4`}
          >
            <ChevronLeft size={28} strokeWidth={1.25} />
          </button>
        </div>
        <div
          className="pointer-events-none absolute right-0 top-0 z-10"
          style={{ width: slideWidth, aspectRatio: imageAspectRatio }}
        >
          <button
            type="button"
            aria-label="下一組"
            onClick={onNext}
            className={`${btnClass} pointer-events-auto right-2 md:right-4`}
          >
            <ChevronRight size={28} strokeWidth={1.25} />
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        aria-label="上一組"
        onClick={onPrev}
        className={`${btnClass} absolute left-2 top-1/2 z-10 -translate-y-1/2 md:left-4`}
      >
        <ChevronLeft size={28} strokeWidth={1.25} />
      </button>
      <button
        type="button"
        aria-label="下一組"
        onClick={onNext}
        className={`${btnClass} absolute right-2 top-1/2 z-10 -translate-y-1/2 md:right-4`}
      >
        <ChevronRight size={28} strokeWidth={1.25} />
      </button>
    </>
  );
}

export default function InfiniteCarousel({
  title,
  titleClassName = "mb-6 text-[22px] font-black tracking-[0.28em] text-black md:text-[28px]",
  items = [],
  renderItem,
  visibleMd = 4,
  visibleSm = 2,
  className = "",
  contentClassName = "px-4 md:px-16",
  headerClassName = "",
  trackContentClassName = "",
  trackClassName = "",
  slideClassName = "pr-2 md:pr-3",
  mobileAutoplayInterval = 0,
  mobileDraggable = false,
  imageAspectRatio = "",
}) {
  const baseLength = items.length;
  const [visible, setVisible] = useState(visibleMd);
  const [index, setIndex] = useState(baseLength);
  const [animate, setAnimate] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [dragPx, setDragPx] = useState(0);
  const [dragging, setDragging] = useState(false);

  const touchStartX = useRef(0);
  const touchDelta = useRef(0);
  const draggingRef = useRef(false);
  const autoplayPausedRef = useRef(false);
  const autoplayResumeTimer = useRef(null);

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

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const pauseAutoplay = useCallback(() => {
    if (!mobileAutoplayInterval) return;
    autoplayPausedRef.current = true;
    if (autoplayResumeTimer.current) {
      clearTimeout(autoplayResumeTimer.current);
    }
    autoplayResumeTimer.current = setTimeout(() => {
      autoplayPausedRef.current = false;
    }, 6000);
  }, [mobileAutoplayInterval]);

  const go = useCallback(
    (delta) => {
      if (!baseLength) return;
      setAnimate(true);
      setIndex((prev) => prev + delta);
    },
    [baseLength],
  );

  useEffect(() => {
    if (!mobileAutoplayInterval || !isMobile || !baseLength) return;

    const timer = window.setInterval(() => {
      if (autoplayPausedRef.current || draggingRef.current) return;
      go(1);
    }, mobileAutoplayInterval);

    return () => window.clearInterval(timer);
  }, [mobileAutoplayInterval, isMobile, baseLength, go]);

  const handleDragStart = useCallback(
    (clientX) => {
      if (!mobileDraggable || !isMobile) return;
      pauseAutoplay();
      draggingRef.current = true;
      setDragging(true);
      setAnimate(false);
      touchStartX.current = clientX;
      touchDelta.current = 0;
      setDragPx(0);
    },
    [mobileDraggable, isMobile, pauseAutoplay],
  );

  const handleDragMove = useCallback((clientX) => {
    if (!draggingRef.current) return;
    const dx = clientX - touchStartX.current;
    touchDelta.current = dx;
    setDragPx(dx);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);

    if (touchDelta.current < -SWIPE_THRESHOLD) {
      go(1);
    } else if (touchDelta.current > SWIPE_THRESHOLD) {
      go(-1);
    }

    touchDelta.current = 0;
    setDragPx(0);
    setAnimate(true);
  }, [go]);

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
        <div className={`${contentClassName} pt-10 md:pt-12 ${headerClassName}`}>
          <h2 className={titleClassName}>{title}</h2>
        </div>
      ) : null}

      <div
        className={`relative ${title ? "pb-12" : "py-12"} ${trackContentClassName || contentClassName}`}
      >
        <div
          className={`relative overflow-hidden ${trackClassName} ${
            mobileDraggable && isMobile ? "touch-pan-y" : ""
          }`}
          onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
          onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
          onTouchEnd={handleDragEnd}
          onTouchCancel={handleDragEnd}
        >
          <CarouselArrows
            onPrev={() => go(-1)}
            onNext={() => go(1)}
            imageAspectRatio={imageAspectRatio}
            visible={visible}
          />

          <div
            className={`flex ${
              animate && !dragging ? "transition-transform duration-300 ease-out" : ""
            }`}
            style={{
              width: `${innerWidthPercent}%`,
              transform: dragging
                ? `translateX(calc(-${translatePercent}% + ${dragPx}px))`
                : `translateX(-${translatePercent}%)`,
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
