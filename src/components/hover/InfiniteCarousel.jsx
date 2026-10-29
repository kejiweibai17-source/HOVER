"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MOBILE_MQ = "(max-width: 767px)";
const SWIPE_THRESHOLD = 48;
/** 超過此距離才判定軸向，避免誤觸 */
const AXIS_LOCK_PX = 8;

function CarouselArrows({ onPrev, onNext, imageAspectRatio, visible, arrowClassName }) {
  const btnClass =
    arrowClassName ||
    "absolute top-1/2 z-10 flex -translate-y-1/2 items-center justify-center text-[#999] transition-opacity hover:opacity-60";

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
  titleClassName = "mb-6 text-[16px] xl:text-[22px] font-black tracking-[0.28em] text-black md:text-[28px]",
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
  autoplayInterval = 0,
  /** @deprecated 請用 draggable；兩者皆 true 時啟用滑鼠／觸控拖曳 */
  mobileDraggable = true,
  draggable = true,
  imageAspectRatio = "",
  arrowClassName = "",
}) {
  const allowDrag = Boolean(draggable && mobileDraggable);
  const baseLength = items.length;
  const [visible, setVisible] = useState(visibleMd);
  const [index, setIndex] = useState(baseLength);
  const [animate, setAnimate] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [dragPx, setDragPx] = useState(0);
  const [dragging, setDragging] = useState(false);

  const trackRef = useRef(null);
  const pointerIdRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchDelta = useRef(0);
  const axisLock = useRef(null); // null | "x" | "y"
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);
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
    const interval = autoplayInterval || mobileAutoplayInterval;
    if (!interval) return;
    autoplayPausedRef.current = true;
    if (autoplayResumeTimer.current) {
      clearTimeout(autoplayResumeTimer.current);
    }
    autoplayResumeTimer.current = setTimeout(() => {
      autoplayPausedRef.current = false;
    }, 6000);
  }, [autoplayInterval, mobileAutoplayInterval]);

  const go = useCallback(
    (delta) => {
      if (!baseLength) return;
      setAnimate(true);
      setIndex((prev) => prev + delta);
    },
    [baseLength],
  );

  const goByUser = useCallback(
    (delta) => {
      pauseAutoplay();
      go(delta);
    },
    [go, pauseAutoplay],
  );

  useEffect(() => {
    const interval =
      autoplayInterval || (isMobile ? mobileAutoplayInterval : 0);
    if (!interval || !baseLength) return;

    const timer = window.setInterval(() => {
      if (autoplayPausedRef.current || draggingRef.current) return;
      go(1);
    }, interval);

    return () => window.clearInterval(timer);
  }, [autoplayInterval, mobileAutoplayInterval, isMobile, baseLength, go]);

  /* Pointer Events：手指／滑鼠／觸控筆皆可拖曳跟隨；軸向鎖定後才擋垂直捲動 */
  useEffect(() => {
    const el = trackRef.current;
    if (!el || !allowDrag) return undefined;

    const resetDragVisual = () => {
      draggingRef.current = false;
      setDragging(false);
      setDragPx(0);
      setAnimate(true);
    };

    const finish = () => {
      if (axisLock.current === "x" && draggingRef.current) {
        const dx = touchDelta.current;
        if (Math.abs(dx) > AXIS_LOCK_PX) {
          suppressClickRef.current = true;
        }
        if (dx < -SWIPE_THRESHOLD) {
          goByUser(1);
        } else if (dx > SWIPE_THRESHOLD) {
          goByUser(-1);
        }
      }

      pointerIdRef.current = null;
      axisLock.current = null;
      touchDelta.current = 0;
      resetDragVisual();
    };

    const onPointerDown = (e) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      // 收藏等按鈕不介入；連結本身仍可開始「待判定」手勢（小位移＝點擊進內頁）
      if (e.target?.closest?.("button")) return;
      // 桌面僅滑鼠拖曳；手機／平板接受 touch / pen / mouse
      if (!isMobile && e.pointerType !== "mouse") return;

      pointerIdRef.current = e.pointerId;
      touchStartX.current = e.clientX;
      touchStartY.current = e.clientY;
      touchDelta.current = 0;
      // 滑鼠／觸控都等超過 AXIS_LOCK_PX 再鎖軸；勿在 pointerdown 就 capture，
      // 否則會吃掉商品 <Link> 的 click，導致首頁點不進內頁。
      axisLock.current = null;
      draggingRef.current = false;
      setDragging(false);
      setDragPx(0);
    };

    const onPointerMove = (e) => {
      if (pointerIdRef.current !== e.pointerId) return;
      if (axisLock.current === "y") return;

      const dx = e.clientX - touchStartX.current;
      const dy = e.clientY - touchStartY.current;

      if (axisLock.current === null) {
        if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) {
          return;
        }
        axisLock.current = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
        if (axisLock.current === "y") {
          pointerIdRef.current = null;
          resetDragVisual();
          return;
        }
        pauseAutoplay();
        draggingRef.current = true;
        setDragging(true);
        setAnimate(false);
        try {
          el.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }

      if (axisLock.current !== "x") return;

      // touch-action: pan-y 已交垂直給瀏覽器；水平拖曳時再擋預設
      if (e.pointerType !== "mouse" && e.cancelable) {
        e.preventDefault();
      }

      touchDelta.current = dx;
      setDragPx(dx);
    };

    const onPointerUp = (e) => {
      if (pointerIdRef.current !== e.pointerId) return;
      try {
        if (el.hasPointerCapture?.(e.pointerId)) {
          el.releasePointerCapture(e.pointerId);
        }
      } catch {
        /* ignore */
      }
      finish();
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove, { passive: false });
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("lostpointercapture", onPointerUp);

    return () => {
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerUp);
      el.removeEventListener("lostpointercapture", onPointerUp);
    };
  }, [allowDrag, isMobile, goByUser, pauseAutoplay]);

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
        <div
          className={`${contentClassName} pt-10 md:pt-12 ${headerClassName}`}
        >
          <h2 className={titleClassName}>{title}</h2>
        </div>
      ) : null}

      <div
        className={`relative ${title ? "pb-12" : "py-12"} ${trackContentClassName || contentClassName}`}
      >
        <div
          ref={trackRef}
          className={`relative overflow-hidden select-none [&_img]:pointer-events-none ${trackClassName} ${
            allowDrag
              ? `touch-pan-y ${dragging ? "cursor-grabbing" : "cursor-grab"}`
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
          <CarouselArrows
            onPrev={() => goByUser(-1)}
            onNext={() => goByUser(1)}
            imageAspectRatio={imageAspectRatio}
            visible={visible}
            arrowClassName={arrowClassName}
          />

          <div
            className={`flex ${
              animate && !dragging
                ? "transition-transform duration-300 ease-out"
                : ""
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
                className={`min-w-0 shrink-0 overflow-hidden ${slideClassName}`}
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
