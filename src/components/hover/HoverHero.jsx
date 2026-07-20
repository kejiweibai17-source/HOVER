"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { animate, motion, useMotionValue } from "framer-motion";
import {
  getActiveHeroSlides,
  normalizeHeroSettings,
} from "@/lib/heroDefaults";

const SWIPE_THRESHOLD = 52;
const EASE = [0.22, 1, 0.36, 1];
const SLIDE_SPRING = {
  type: "spring",
  stiffness: 220,
  damping: 30,
  mass: 0.9,
};

function HeroCta({ label, href, visible }) {
  const className =
    "group absolute bottom-14 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center text-white";

  const inner = (
    <motion.span
      initial={false}
      animate={{ opacity: visible ? 1 : 0, y: visible ? 0 : 12 }}
      transition={{ duration: 0.55, ease: EASE, delay: visible ? 0.12 : 0 }}
      className="flex flex-col items-center"
    >
      <span className="font-serif text-[18px] tracking-widest md:text-[22px]">
        {label}
      </span>
      <span className="mt-2 h-px w-[120px] bg-white transition-all duration-500 group-hover:w-[160px]" />
    </motion.span>
  );

  if (href.startsWith("http")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link href={href || "/products"} className={className}>
      {inner}
    </Link>
  );
}

function HeroMedia({ slide, isActive, dragging }) {
  const videoRef = useRef(null);
  const isVideo = slide.mediaType === "video" && Boolean(slide.video?.url);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isVideo) return undefined;

    el.muted = true;
    el.defaultMuted = true;
    el.setAttribute("muted", "");
    el.playsInline = true;

    if (isActive && !dragging) {
      const play = () => {
        const p = el.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      };
      play();
      // 部分瀏覽器需等 canplay 再播
      el.addEventListener("canplay", play);
      return () => el.removeEventListener("canplay", play);
    }

    el.pause();
    return undefined;
  }, [isActive, dragging, isVideo, slide.video?.url]);

  if (isVideo) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover object-center"
          src={slide.video.url}
          poster={slide.image?.url || undefined}
          muted
          loop
          playsInline
          autoPlay={isActive}
          preload="auto"
          controls={false}
          disablePictureInPicture
          draggable={false}
        />
      </div>
    );
  }

  return (
    <motion.div
      className="absolute inset-0"
      animate={{
        scale: isActive && !dragging ? 1.06 : 1,
      }}
      transition={
        isActive && !dragging
          ? {
              duration: 6,
              ease: "linear",
            }
          : { duration: 0.8, ease: EASE }
      }
    >
      <Image
        src={slide.image.url}
        alt={slide.image.alt || "HOVER"}
        fill
        priority={isActive}
        sizes="100vw"
        className="object-cover object-top"
        draggable={false}
      />
    </motion.div>
  );
}

function HeroSkeleton() {
  return (
    <section className="relative w-full overflow-hidden bg-[#111]">
      <div className="h-[85vh] min-h-[560px] w-full animate-pulse bg-[#1a1a1a] md:h-[calc(100dvh-var(--hover-header-height,116px))] md:min-h-0" />
    </section>
  );
}

export default function HoverHero({ initialHero = null }) {
  const [hero, setHero] = useState(() =>
    initialHero ? normalizeHeroSettings(initialHero) : null,
  );
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
    if (initialHero) return undefined;

    let cancelled = false;

    fetch("/api/hero")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setHero(normalizeHeroSettings(data?.hero));
        setIndex(0);
      })
      .catch(() => {
        if (!cancelled) setHero(null);
      });

    return () => {
      cancelled = true;
    };
  }, [initialHero]);

  const slides = hero ? getActiveHeroSlides(hero) : [];
  const count = slides.length;

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
  }, [hero]);

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

  useEffect(() => {
    if (index >= count && count > 0) {
      setIndex(0);
    }
  }, [count, index]);

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
    }, hero?.autoplayMs ?? 5000);

    return () => window.clearInterval(timer);
  }, [count, hero?.autoplayMs, go]);

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

  if (!hero) return <HeroSkeleton />;
  if (!count) return null;

  return (
    <section className="relative w-full overflow-hidden bg-black">
      <div
        ref={viewportRef}
        className="relative h-[85vh] min-h-[560px] w-full touch-pan-y overflow-hidden select-none md:h-[calc(100dvh-var(--hover-header-height,116px))] md:min-h-0"
        onTouchStart={(e) =>
          handleDragStart(e.touches[0].clientX, e.target)
        }
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
          {slides.map((slide, slideIndex) => {
            const isActive = slideIndex === index;
            return (
              <div
                key={slide.id}
                className="relative h-full shrink-0 overflow-hidden"
                style={{ width: `${100 / count}%` }}
              >
                <HeroMedia
                  slide={slide}
                  isActive={isActive}
                  dragging={dragging}
                />

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />

                {slide.cta.show && slide.cta.label && (
                  <HeroCta
                    label={slide.cta.label}
                    href={slide.link.href || "/products"}
                    visible={isActive && !dragging}
                  />
                )}
              </div>
            );
          })}
        </motion.div>

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="上一張"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 z-20 hidden -translate-y-1/2 text-white/90 transition-opacity hover:opacity-100 md:flex md:left-6"
            >
              <ChevronLeft size={32} strokeWidth={1.25} />
            </button>
            <button
              type="button"
              aria-label="下一張"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 text-white/90 transition-opacity hover:opacity-100 md:flex md:right-6"
            >
              <ChevronRight size={32} strokeWidth={1.25} />
            </button>

            <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`第 ${i + 1} 張`}
                  onClick={() => goTo(i)}
                  className="relative h-1.5 overflow-hidden rounded-full bg-white/30 transition-all duration-500"
                  style={{ width: i === index ? 24 : 6 }}
                >
                  <motion.span
                    className="absolute inset-0 rounded-full bg-white"
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
    </section>
  );
}
