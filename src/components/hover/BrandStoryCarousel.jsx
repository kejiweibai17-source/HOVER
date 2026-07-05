"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { animate, motion, useMotionValue } from "framer-motion";

const SWIPE_THRESHOLD = 48;
const EASE = [0.22, 1, 0.36, 1];
const SLIDE_SPRING = {
  type: "spring",
  stiffness: 220,
  damping: 30,
  mass: 0.9,
};

export default function BrandStoryCarousel({
  slides = [],
  className = "",
  autoplayMs = 5000,
}) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [dragging, setDragging] = useState(false);

  const x = useMotionValue(0);
  const touchStartX = useRef(0);
  const touchDelta = useRef(0);
  const draggingRef = useRef(false);
  const indexRef = useRef(0);
  const instantSnapRef = useRef(false);
  const autoplayPausedRef = useRef(false);
  const autoplayResumeTimer = useRef(null);
  const viewportRef = useRef(null);

  useEffect(() => {
    indexRef.current = index;
  }, [index]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;

    const update = () => setViewportWidth(el.offsetWidth);
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  const snapTo = useCallback(
    (targetIndex, { instant = false } = {}) => {
      if (!viewportWidth) return;
      const targetX = -targetIndex * viewportWidth;
      if (instant) {
        x.set(targetX);
        return;
      }
      animate(x, targetX, SLIDE_SPRING);
    },
    [viewportWidth, x],
  );

  useEffect(() => {
    if (!dragging && viewportWidth) {
      snapTo(index, { instant: instantSnapRef.current });
      instantSnapRef.current = false;
    }
  }, [index, viewportWidth, dragging, snapTo]);

  const pauseAutoplay = useCallback(() => {
    autoplayPausedRef.current = true;
    if (autoplayResumeTimer.current) {
      clearTimeout(autoplayResumeTimer.current);
    }
    autoplayResumeTimer.current = setTimeout(() => {
      autoplayPausedRef.current = false;
    }, 8000);
  }, []);

  const goTo = useCallback(
    (nextIndex, { instant = false } = {}) => {
      if (count <= 1) return;
      const normalized = ((nextIndex % count) + count) % count;
      instantSnapRef.current = instant;
      setIndex(normalized);
      pauseAutoplay();
    },
    [count, pauseAutoplay],
  );

  const go = useCallback(
    (delta) => {
      if (count <= 1) return;
      const current = indexRef.current;
      const next = (current + delta + count) % count;
      const isWrap =
        Math.abs(delta) === 1 &&
        ((current === count - 1 && next === 0) ||
          (current === 0 && next === count - 1));
      goTo(next, { instant: isWrap });
    },
    [count, goTo],
  );

  useEffect(() => {
    if (count <= 1) return undefined;

    const timer = window.setInterval(() => {
      if (autoplayPausedRef.current || draggingRef.current) return;
      go(1);
    }, autoplayMs);

    return () => window.clearInterval(timer);
  }, [count, autoplayMs, go]);

  const handleDragStart = useCallback(
    (clientX, target) => {
      if (count <= 1 || !viewportWidth) return;
      if (target?.closest?.("a, button")) return;

      pauseAutoplay();
      draggingRef.current = true;
      setDragging(true);
      touchStartX.current = clientX;
      touchDelta.current = 0;
    },
    [count, viewportWidth, pauseAutoplay],
  );

  const handleDragMove = useCallback(
    (clientX) => {
      if (!draggingRef.current || !viewportWidth) return;
      const dx = clientX - touchStartX.current;
      touchDelta.current = dx;
      const base = -indexRef.current * viewportWidth;
      x.set(base + dx);
    },
    [viewportWidth, x],
  );

  const handleDragEnd = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);

    if (touchDelta.current < -SWIPE_THRESHOLD) {
      go(1);
    } else if (touchDelta.current > SWIPE_THRESHOLD) {
      go(-1);
    } else {
      snapTo(indexRef.current);
    }

    touchDelta.current = 0;
  }, [go, snapTo]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      handleDragStart(e.clientX, e.target);
    };
    const onMouseMove = (e) => handleDragMove(e.clientX);
    const onMouseUp = () => handleDragEnd();

    el.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      el.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [handleDragStart, handleDragMove, handleDragEnd]);

  if (!count) return null;

  return (
    <div
      ref={viewportRef}
      className={`relative w-full touch-pan-y overflow-hidden select-none ${className}`}
      onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.target)}
      onTouchMove={(e) => {
        if (!draggingRef.current) return;
        e.preventDefault();
        handleDragMove(e.touches[0].clientX);
      }}
      onTouchEnd={handleDragEnd}
      onTouchCancel={handleDragEnd}
    >
      <motion.div
        className="flex h-full will-change-transform"
        style={{ x, width: `${count * 100}%` }}
      >
        {slides.map((slide, slideIndex) => (
          <div
            key={slide.id}
            className="relative h-full shrink-0 overflow-hidden"
            style={{ width: `${100 / count}%` }}
          >
            <Image
              src={slide.src}
              alt={slide.alt || "HOVER"}
              fill
              priority={slideIndex === 0}
              sizes="(max-width: 768px) 100vw, 58vw"
              className="object-cover"
              draggable={false}
            />
            <span className="pointer-events-none absolute bottom-8 left-8 font-black text-[36px] leading-none tracking-tight text-black mix-blend-multiply opacity-90 md:text-[52px]">
              HOVER
            </span>
          </div>
        ))}
      </motion.div>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="上一張"
            onClick={() => go(-1)}
            className="absolute left-3 top-1/2 z-20 -translate-y-1/2 text-black/70 transition-opacity hover:opacity-100 md:left-6"
          >
            <ChevronLeft size={28} strokeWidth={1.25} />
          </button>
          <button
            type="button"
            aria-label="下一張"
            onClick={() => go(1)}
            className="absolute right-3 top-1/2 z-20 -translate-y-1/2 text-black/70 transition-opacity hover:opacity-100 md:right-6"
          >
            <ChevronRight size={28} strokeWidth={1.25} />
          </button>

          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 md:bottom-6">
            {slides.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                aria-label={`第 ${i + 1} 張`}
                onClick={() => goTo(i)}
                className="relative h-1.5 overflow-hidden rounded-full bg-black/25 transition-all duration-500"
                style={{ width: i === index ? 24 : 6 }}
              >
                <motion.span
                  className="absolute inset-0 rounded-full bg-black/70"
                  initial={false}
                  animate={{ opacity: i === index ? 1 : 0.45 }}
                  transition={{ duration: 0.4, ease: EASE }}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
