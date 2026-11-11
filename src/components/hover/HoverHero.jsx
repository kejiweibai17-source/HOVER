"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "next-view-transitions";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { animate, motion, useMotionValue } from "framer-motion";
import OptimizedImage from "@/components/hover/OptimizedImage";
import {
  buildYoutubeEmbedSrc,
  getActiveHeroSlides,
  getYoutubePosterUrl,
  HERO_YOUTUBE_START_SEC,
  isHeroYoutubeSlide,
  normalizeHeroSettings,
  parseYoutubeVideoId,
  resolveHeroImageAlt,
  resolveHeroImageUrl,
} from "@/lib/heroDefaults";

const SWIPE_THRESHOLD = 48;
const VELOCITY_THRESHOLD = 450;
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

function postYoutubeCommand(iframe, func, args = []) {
  const win = iframe?.contentWindow;
  if (!win) return;
  win.postMessage(
    JSON.stringify({ event: "command", func, args }),
    "*",
  );
}

function HeroYoutube({ videoId, isActive, dragging }) {
  const iframeRef = useRef(null);
  const primedRef = useRef(false);
  const [mounted, setMounted] = useState(isActive);
  const [showCover, setShowCover] = useState(true);
  const [embedSrc, setEmbedSrc] = useState(() =>
    buildYoutubeEmbedSrc(videoId, { autoplay: true }),
  );
  const posterUrl = getYoutubePosterUrl(videoId);

  useEffect(() => {
    if (isActive) setMounted(true);
  }, [isActive]);

  useEffect(() => {
    const origin =
      typeof window !== "undefined" ? window.location.origin : undefined;
    setEmbedSrc(buildYoutubeEmbedSrc(videoId, { autoplay: true, origin }));
    setShowCover(true);
    primedRef.current = false;
  }, [videoId]);

  const kickPlay = useCallback(
    ({ seekToStart = false } = {}) => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      iframe.contentWindow?.postMessage(
        JSON.stringify({ event: "listening", id: videoId }),
        "*",
      );
      postYoutubeCommand(iframe, "mute");
      if (seekToStart) {
        postYoutubeCommand(iframe, "seekTo", [HERO_YOUTUBE_START_SEC, true]);
      }
      postYoutubeCommand(iframe, "playVideo");
      if (!primedRef.current) {
        postYoutubeCommand(iframe, "setPlaybackQuality", ["highres"]);
        postYoutubeCommand(iframe, "setPlaybackQuality", ["hd1080"]);
        primedRef.current = true;
      }
    },
    [videoId],
  );

  useEffect(() => {
    const onMessage = (event) => {
      if (typeof event.origin !== "string") return;
      if (
        !event.origin.includes("youtube.com") &&
        !event.origin.includes("youtube-nocookie.com")
      ) {
        return;
      }

      let data = event.data;
      if (typeof data === "string") {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }
      if (!data || typeof data !== "object") return;

      const state =
        data.event === "onStateChange"
          ? data.info
          : data.event === "infoDelivery"
            ? data.info?.playerState
            : undefined;

      // 1 = playing：盡快掀開封面，一進來就能看到畫面
      if (state === 1) setShowCover(false);

      // 0 = ended：loop 常會回到 0 秒，再跳回片頭後起點
      if (state === 0) {
        kickPlay({ seekToStart: true });
      }
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [kickPlay]);

  useEffect(() => {
    if (!mounted) return undefined;

    if (!(isActive && !dragging)) {
      postYoutubeCommand(iframeRef.current, "pauseVideo");
      setShowCover(true);
      return undefined;
    }

    // 只在進場時啟動／重試幾次，不要週期 playVideo（會一直閃暫停鈕）
    kickPlay({ seekToStart: true });
    const timers = [250, 700, 1500].map((ms) =>
      window.setTimeout(() => kickPlay({ seekToStart: false }), ms),
    );
    const uncoverFallback = window.setTimeout(() => setShowCover(false), 1200);

    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      window.clearTimeout(uncoverFallback);
    };
  }, [isActive, dragging, mounted, videoId, kickPlay]);

  if (!mounted) {
    return (
      <div className="absolute inset-0 overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={posterUrl}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
          draggable={false}
        />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-black">
      <iframe
        ref={iframeRef}
        key={embedSrc}
        className="absolute left-1/2 top-1/2 z-[1] aspect-video h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 border-0"
        src={embedSrc}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => kickPlay({ seekToStart: true })}
      />
      {showCover && (
        <div className="absolute inset-0 z-[2] bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={posterUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            draggable={false}
          />
        </div>
      )}
    </div>
  );
}

function HeroMedia({ slide, isActive, dragging }) {
  const videoRef = useRef(null);
  const youtubeId =
    slide.mediaType === "video"
      ? parseYoutubeVideoId(slide.video?.url || "")
      : null;
  const isYoutube = Boolean(youtubeId);
  const isVideo =
    !isYoutube &&
    slide.mediaType === "video" &&
    Boolean(slide.video?.url);

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

  if (isYoutube && youtubeId) {
    return (
      <HeroYoutube
        videoId={youtubeId}
        isActive={isActive}
        dragging={dragging}
      />
    );
  }

  if (isVideo) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover object-center"
          src={slide.video.url}
          poster={resolveHeroImageUrl(slide, "desktop") || undefined}
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

  const desktopUrl = resolveHeroImageUrl(slide, "desktop");
  const mobileUrl = resolveHeroImageUrl(slide, "mobile");
  const desktopAlt = resolveHeroImageAlt(slide, "desktop");
  const mobileAlt = resolveHeroImageAlt(slide, "mobile");
  const hasSeparateMobile = Boolean(
    slide.imageMobile?.url?.trim() &&
      slide.imageMobile.url.trim() !== desktopUrl,
  );

  return (
    <div className="absolute inset-0">
      <OptimizedImage
        src={desktopUrl}
        fullSrc={desktopUrl}
        role="banner"
        alt={desktopAlt}
        fill
        priority={isActive}
        sizes="100vw"
        className="object-cover object-top hidden md:block"
        draggable={false}
      />
      <OptimizedImage
        src={hasSeparateMobile ? mobileUrl : desktopUrl}
        fullSrc={hasSeparateMobile ? mobileUrl : desktopUrl}
        role="bannerMobile"
        alt={hasSeparateMobile ? mobileAlt : desktopAlt}
        fill
        priority={isActive}
        sizes="100vw"
        className="object-cover object-top md:hidden"
        draggable={false}
      />
    </div>
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
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);
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

  const activeIsYoutube =
    count > 0 && slides[index] ? isHeroYoutubeSlide(slides[index]) : false;

  useEffect(() => {
    if (count <= 1) return undefined;

    // YouTube 主視覺採自身無限循環，停留在該張時不自動切下一張
    if (activeIsYoutube) return undefined;

    const timer = window.setInterval(() => {
      if (autoplayPausedRef.current || draggingRef.current) return;
      go(1);
    }, hero?.autoplayMs ?? 5000);

    return () => window.clearInterval(timer);
  }, [count, hero?.autoplayMs, go, activeIsYoutube]);

  const dragConstraints =
    count > 1 && viewportWidth > 0
      ? { left: -((count - 1) * viewportWidth), right: 0 }
      : { left: 0, right: 0 };

  const handleDragStart = useCallback(() => {
    if (count <= 1) return;
    pauseAutoplay();
    draggingRef.current = true;
    setDragging(true);
  }, [count, pauseAutoplay]);

  const handleDragEnd = useCallback(
    (_event, info) => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      setDragging(false);

      const { offset, velocity } = info;
      const moved = Math.abs(offset.x) > 8 || Math.abs(velocity.x) > 80;
      if (moved) suppressClickRef.current = true;

      const goNext =
        offset.x < -SWIPE_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD;
      const goPrev =
        offset.x > SWIPE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD;

      if (goNext) {
        go(1);
      } else if (goPrev) {
        go(-1);
      } else {
        snapTo(indexRef.current);
      }
    },
    [go, snapTo],
  );

  if (!hero) return <HeroSkeleton />;
  if (!count) return null;

  return (
    <section className="relative w-full overflow-hidden bg-black">
      <div
        ref={viewportRef}
        className={`relative h-[85vh] min-h-[560px] w-full overflow-hidden select-none [&_img]:pointer-events-none md:h-[calc(100dvh-var(--hover-header-height,116px))] md:min-h-0 ${
          count > 1
            ? dragging
              ? "cursor-grabbing"
              : "cursor-grab"
            : ""
        }`}
        onClickCapture={(e) => {
          if (!suppressClickRef.current) return;
          e.preventDefault();
          e.stopPropagation();
          suppressClickRef.current = false;
        }}
        onDragStart={(e) => e.preventDefault()}
      >
        <motion.div
          className="flex h-full touch-pan-y will-change-transform"
          style={{ x, width: `${count * 100}%` }}
          drag={count > 1 && viewportWidth > 0 ? "x" : false}
          dragDirectionLock
          dragConstraints={dragConstraints}
          dragElastic={0.16}
          dragMomentum={false}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
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
