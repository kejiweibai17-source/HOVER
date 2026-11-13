"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "next-view-transitions";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { animate, motion, useMotionValue } from "framer-motion";
import OptimizedImage from "@/components/hover/OptimizedImage";
import {
  getActiveHeroSlides,
  getYoutubePosterUrl,
  HERO_YOUTUBE_START_SEC,
  isHeroVideoSlide,
  normalizeHeroSettings,
  parseYoutubeVideoId,
  isYoutubeThumbUrl,
  resolveHeroImageAlt,
  resolveHeroImageUrl,
  resolveHeroVideoUrl,
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
  // 必須在拖曳層外／可點；並擋下 pointer 以免被 swipe 吃掉
  const className =
    "group absolute bottom-16 left-1/2 z-30 flex w-[min(100%,280px)] -translate-x-1/2 touch-manipulation flex-col items-center px-6 py-4 text-white pointer-events-auto md:bottom-14";

  const stopDragBleed = (e) => {
    e.stopPropagation();
  };

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

  if (!visible) {
    return (
      <div className={className} aria-hidden style={{ pointerEvents: "none" }}>
        {inner}
      </div>
    );
  }

  if (href.startsWith("http")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onPointerDown={stopDragBleed}
        onTouchStart={stopDragBleed}
        onClick={stopDragBleed}
      >
        {inner}
      </a>
    );
  }

  return (
    <Link
      href={href || "/products"}
      className={className}
      onPointerDown={stopDragBleed}
      onTouchStart={stopDragBleed}
      onClick={stopDragBleed}
    >
      {inner}
    </Link>
  );
}

let youtubeApiPromise = null;

function loadYoutubeIframeApi() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no window"));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      resolve(window.YT);
    };

    if (!document.getElementById("youtube-iframe-api")) {
      const tag = document.createElement("script");
      tag.id = "youtube-iframe-api";
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    const poll = window.setInterval(() => {
      if (window.YT?.Player) {
        window.clearInterval(poll);
        resolve(window.YT);
      }
    }, 40);
  });

  return youtubeApiPromise;
}

function HeroYoutube({ videoId, isActive, dragging, shouldLoop, onEnded }) {
  const boxRef = useRef(null);
  const playerRef = useRef(null);
  const loopingRef = useRef(false);
  const endedOnceRef = useRef(false);
  const onEndedRef = useRef(onEnded);
  const shouldLoopRef = useRef(shouldLoop);
  const [mounted, setMounted] = useState(isActive);
  const [showCover, setShowCover] = useState(true);
  const [needsTap, setNeedsTap] = useState(false);
  const posterUrl = getYoutubePosterUrl(videoId);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    shouldLoopRef.current = shouldLoop;
  }, [shouldLoop]);

  useEffect(() => {
    if (isActive) {
      setMounted(true);
      endedOnceRef.current = false;
    }
  }, [isActive]);

  const restartLoop = useCallback((player) => {
    if (!player || typeof player.seekTo !== "function") return;
    loopingRef.current = true;
    setShowCover(true);
    try {
      player.mute?.();
      player.seekTo(HERO_YOUTUBE_START_SEC, true);
      player.playVideo?.();
    } catch {
      // ignore
    }
  }, []);

  const finishPlayback = useCallback(
    (player) => {
      if (endedOnceRef.current) return;
      endedOnceRef.current = true;
      if (shouldLoopRef.current) {
        endedOnceRef.current = false;
        restartLoop(player);
        return;
      }
      setShowCover(true);
      try {
        player?.pauseVideo?.();
      } catch {
        // ignore
      }
      onEndedRef.current?.();
    },
    [restartLoop],
  );

  const tryPlay = useCallback(() => {
    const player = playerRef.current;
    if (!player || typeof player.playVideo !== "function") return;
    try {
      if (typeof player.mute === "function") player.mute();
      if (typeof player.seekTo === "function") {
        const t =
          typeof player.getCurrentTime === "function"
            ? player.getCurrentTime()
            : 0;
        if (!t || t < HERO_YOUTUBE_START_SEC - 0.25) {
          player.seekTo(HERO_YOUTUBE_START_SEC, true);
        }
      }
      player.playVideo();
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!mounted) return undefined;

    let cancelled = false;
    let unlockTap = null;
    let failSafeTimer = null;
    let endWatch = null;
    const box = boxRef.current;

    loadYoutubeIframeApi()
      .then((YT) => {
        if (cancelled || !box) return;

        try {
          playerRef.current?.destroy?.();
        } catch {
          // ignore
        }
        box.innerHTML = "";
        const mount = document.createElement("div");
        mount.style.width = "100%";
        mount.style.height = "100%";
        box.appendChild(mount);

        // 關閉 YouTube 內建 loop；單張才自行循環，多張則播完換下一張
        const player = new YT.Player(mount, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            mute: 1,
            controls: 0,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            loop: 0,
            start: HERO_YOUTUBE_START_SEC,
            iv_load_policy: 3,
            disablekb: 1,
            fs: 0,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              try {
                event.target.mute();
                event.target.playVideo();
              } catch {
                // ignore
              }
              failSafeTimer = window.setTimeout(() => {
                try {
                  const state = event.target.getPlayerState?.();
                  if (state !== YT.PlayerState.PLAYING) setNeedsTap(true);
                } catch {
                  setNeedsTap(true);
                }
              }, 1800);

              // 結束前先觸發換頁／循環，縮短 YouTube 結尾黑屏
              endWatch = window.setInterval(() => {
                const p = playerRef.current;
                if (!p || typeof p.getCurrentTime !== "function") return;
                try {
                  const state = p.getPlayerState?.();
                  if (state === YT.PlayerState.BUFFERING) {
                    if (shouldLoopRef.current && loopingRef.current) {
                      setShowCover(true);
                    }
                    return;
                  }
                  const t = p.getCurrentTime() || 0;
                  const d = p.getDuration?.() || 0;
                  if (d > HERO_YOUTUBE_START_SEC + 1 && d - t <= 0.45) {
                    finishPlayback(p);
                  }
                } catch {
                  // ignore
                }
              }, 200);
            },
            onStateChange: (event) => {
              if (event.data === YT.PlayerState.PLAYING) {
                loopingRef.current = false;
                setShowCover(false);
                setNeedsTap(false);
              }
              if (
                event.data === YT.PlayerState.BUFFERING ||
                event.data === YT.PlayerState.CUED
              ) {
                if (shouldLoopRef.current && loopingRef.current) {
                  setShowCover(true);
                }
              }
              if (event.data === YT.PlayerState.ENDED) {
                finishPlayback(event.target);
              }
            },
          },
        });
        playerRef.current = player;
      })
      .catch(() => {
        setNeedsTap(true);
      });

    unlockTap = () => {
      tryPlay();
      setShowCover(false);
      setNeedsTap(false);
    };
    document.addEventListener("touchstart", unlockTap, {
      once: true,
      passive: true,
    });
    document.addEventListener("click", unlockTap, { once: true });

    const uncover = window.setTimeout(() => setShowCover(false), 1600);

    return () => {
      cancelled = true;
      window.clearTimeout(uncover);
      if (failSafeTimer) window.clearTimeout(failSafeTimer);
      if (endWatch) window.clearInterval(endWatch);
      if (unlockTap) {
        document.removeEventListener("touchstart", unlockTap);
        document.removeEventListener("click", unlockTap);
      }
      try {
        playerRef.current?.destroy?.();
      } catch {
        // ignore
      }
      playerRef.current = null;
      if (box) box.innerHTML = "";
    };
  }, [mounted, videoId, tryPlay, finishPlayback]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    if (isActive && !dragging) {
      endedOnceRef.current = false;
      tryPlay();
      return;
    }

    try {
      player.pauseVideo?.();
    } catch {
      // ignore
    }
  }, [isActive, dragging, tryPlay]);

  if (!mounted) {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden bg-black">
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
    <div className="absolute inset-0 overflow-hidden bg-black">
      {/* 底層永遠放封面，緩衝／結尾時至少不會整片黑 */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={posterUrl}
        alt=""
        className="pointer-events-none absolute inset-0 z-0 h-full w-full object-cover object-center"
        draggable={false}
      />

      <div className="pointer-events-none absolute left-1/2 top-1/2 z-[1] aspect-video h-[56.25vw] min-h-full w-[177.78vh] min-w-[220%] -translate-x-1/2 -translate-y-1/2 md:min-w-full">
        <div
          ref={boxRef}
          className="h-full w-full [&_iframe]:pointer-events-none"
        />
      </div>

      {showCover && (
        <div className="pointer-events-none absolute inset-0 z-[2] bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={posterUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center"
            draggable={false}
          />
        </div>
      )}

      {needsTap && isActive && (
        <button
          type="button"
          className="absolute inset-0 z-[3] flex items-center justify-center bg-black/35 text-white touch-manipulation"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            tryPlay();
            setShowCover(false);
            setNeedsTap(false);
          }}
        >
          <span className="rounded-full border border-white/70 px-5 py-2 font-serif text-sm tracking-[0.2em]">
            輕觸播放
          </span>
        </button>
      )}
    </div>
  );
}

function HeroMedia({ slide, isActive, dragging, shouldLoop, onEnded }) {
  const videoRef = useRef(null);
  const endedOnceRef = useRef(false);
  const onEndedRef = useRef(onEnded);
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
    onEndedRef.current = onEnded;
  }, [onEnded]);

  useEffect(() => {
    if (isActive) endedOnceRef.current = false;
  }, [isActive]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !isVideo) return undefined;

    el.muted = true;
    el.defaultMuted = true;
    el.setAttribute("muted", "");
    el.setAttribute("playsinline", "");
    el.setAttribute("webkit-playsinline", "");
    el.playsInline = true;
    el.loop = Boolean(shouldLoop);

    const play = () => {
      el.muted = true;
      const p = el.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    const handleEnded = () => {
      if (shouldLoop) {
        try {
          el.currentTime = 0;
        } catch {
          /* ignore */
        }
        play();
        return;
      }
      if (endedOnceRef.current) return;
      endedOnceRef.current = true;
      onEndedRef.current?.();
    };

    el.addEventListener("ended", handleEnded);

    if (isActive && !dragging) {
      endedOnceRef.current = false;
      play();
      el.addEventListener("canplay", play);
      return () => {
        el.removeEventListener("canplay", play);
        el.removeEventListener("ended", handleEnded);
      };
    }

    el.pause();
    return () => {
      el.removeEventListener("ended", handleEnded);
    };
  }, [isActive, dragging, isVideo, shouldLoop, slide.video?.url]);

  if (isYoutube && youtubeId) {
    return (
      <HeroYoutube
        videoId={youtubeId}
        isActive={isActive}
        dragging={dragging}
        shouldLoop={shouldLoop}
        onEnded={onEnded}
      />
    );
  }

  if (isVideo) {
    const videoSrc = resolveHeroVideoUrl(slide.video.url);
    const posterRaw = resolveHeroImageUrl(slide, "desktop");
    const poster =
      posterRaw && !isYoutubeThumbUrl(posterRaw) ? posterRaw : undefined;
    return (
      <div className="absolute inset-0 overflow-hidden">
        <video
          key={videoSrc}
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover object-center"
          src={videoSrc}
          poster={poster}
          muted
          loop={shouldLoop}
          playsInline
          autoPlay={isActive && !dragging}
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

  /** 影片播完換下一張：不觸發 pauseAutoplay，讓後續圖片照 interval 繼續轉 */
  const advanceAfterMedia = useCallback(() => {
    if (count <= 1) return;
    if (draggingRef.current) return;
    const current = indexRef.current;
    const next = (current + 1) % count;
    instantSnapRef.current = current === count - 1 && next === 0;
    setIndex(next);
  }, [count]);

  const activeIsVideo =
    count > 0 && slides[index] ? isHeroVideoSlide(slides[index]) : false;
  const shouldLoopVideo = count <= 1;

  useEffect(() => {
    if (count <= 1) return undefined;

    // 影片主視覺播完整段後由 onEnded 換頁，不在此用 interval 截斷
    if (activeIsVideo) return undefined;

    const timer = window.setInterval(() => {
      if (autoplayPausedRef.current || draggingRef.current) return;
      go(1);
    }, hero?.autoplayMs ?? 5000);

    return () => window.clearInterval(timer);
  }, [count, hero?.autoplayMs, go, activeIsVideo]);

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

  const activeSlide = slides[index];

  return (
    <section className="relative w-full overflow-hidden bg-black">
      <div
        ref={viewportRef}
        className={`relative h-[78vh] min-h-[480px] w-full overflow-hidden select-none [&_img]:pointer-events-none md:h-[calc(100dvh-var(--hover-header-height,116px))] md:min-h-0 ${
          count > 1
            ? dragging
              ? "cursor-grabbing"
              : "cursor-grab"
            : ""
        }`}
        onClickCapture={(e) => {
          if (!suppressClickRef.current) return;
          // 手機點 CTA／圓點時不要被 swipe 抑制吃掉
          if (e.target?.closest?.("a,button")) {
            suppressClickRef.current = false;
            return;
          }
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
                  shouldLoop={shouldLoopVideo}
                  onEnded={isActive ? advanceAfterMedia : undefined}
                />

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10" />
              </div>
            );
          })}
        </motion.div>

        {/* CTA 放拖曳層外，手機才能穩定點到 */}
        {activeSlide?.cta?.show && activeSlide?.cta?.label && (
          <HeroCta
            label={activeSlide.cta.label}
            href={activeSlide.link?.href || "/products"}
            visible={!dragging}
          />
        )}

        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="上一張"
              onClick={() => go(-1)}
              className="absolute left-2 top-1/2 z-30 flex -translate-y-1/2 touch-manipulation p-2 text-white/90 md:left-6 md:p-0"
            >
              <ChevronLeft size={28} strokeWidth={1.25} className="md:hidden" />
              <ChevronLeft
                size={32}
                strokeWidth={1.25}
                className="hidden md:block"
              />
            </button>
            <button
              type="button"
              aria-label="下一張"
              onClick={() => go(1)}
              className="absolute right-2 top-1/2 z-30 flex -translate-y-1/2 touch-manipulation p-2 text-white/90 md:right-6 md:p-0"
            >
              <ChevronRight size={28} strokeWidth={1.25} className="md:hidden" />
              <ChevronRight
                size={32}
                strokeWidth={1.25}
                className="hidden md:block"
              />
            </button>

            <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2.5 md:bottom-6 md:gap-2">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`第 ${i + 1} 張`}
                  onClick={() => goTo(i)}
                  className="relative h-2 overflow-hidden rounded-full bg-white/30 touch-manipulation transition-all duration-500 md:h-1.5"
                  style={{ width: i === index ? 28 : 8 }}
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
