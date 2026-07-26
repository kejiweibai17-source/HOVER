"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { AnimatePresence, motion } from "framer-motion";
import { Gift, X } from "lucide-react";
import { useAuthStore } from "@/lib/authStore";
import {
  DEFAULT_POPUP,
  buttonWidthPx,
  isPopupDismissed,
  isPopupVisible,
  markPopupDismissed,
  normalizePopupSettings,
  typeStyle,
} from "@/lib/popupDefaults";

function useIsMobile(breakpoint = 768) {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [breakpoint]);
  return mobile;
}

function CtaButton({ label, href, button, onNavigate }) {
  const width = button?.width || "M";
  const variant = button?.variant || "brand";
  const fontSize = button?.fontSize || 13;
  const fontWeight = button?.fontWeight || 600;
  const isWhite = variant === "white";

  const className = isWhite
    ? "inline-flex h-11 items-center justify-center px-5 tracking-[0.14em] text-[#222] transition-opacity hover:opacity-85 bg-white border border-[#ddd]"
    : "inline-flex h-11 items-center justify-center px-5 tracking-[0.14em] text-white transition-opacity hover:opacity-85 bg-[#2a514d]";

  const style = {
    minWidth: `${buttonWidthPx(width)}px`,
    fontSize: `${fontSize}px`,
    fontWeight,
  };

  const onClick = () => onNavigate?.();

  if (href.startsWith("http")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        style={style}
        onClick={onClick}
      >
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className} style={style} onClick={onClick}>
      {label}
    </Link>
  );
}

function GiftIcon({ color = "#2a514d", scale = 140 }) {
  const s = (Number(scale) || 140) / 100;
  const box = Math.round(40 * s);
  const icon = Math.round(28 * s);
  return (
    <div
      className="mx-auto flex shrink-0 items-center justify-center"
      style={{ color, width: box, height: box }}
    >
      <Gift size={icon} strokeWidth={1.35} aria-hidden />
    </div>
  );
}

function FootnoteText({ text, links, color, style }) {
  const items = [links?.terms, links?.privacy]
    .filter((item) => item?.label && item?.href)
    .sort((a, b) => b.label.length - a.label.length);

  if (!text) return null;

  const linkClassName =
    "underline decoration-[#2a514d] decoration-1 underline-offset-[3px] hover:opacity-70";

  if (items.length === 0) {
    return (
      <p className="max-w-[260px]" style={{ color, ...style }}>
        {text}
      </p>
    );
  }

  const pattern = new RegExp(
    `(${items.map((i) => i.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "g",
  );
  const parts = text.split(pattern);

  return (
    <p className="max-w-[260px]" style={{ color, ...style }}>
      {parts.map((part, idx) => {
        const match = items.find((i) => i.label === part);
        if (!match) return part;
        const href = match.href;
        if (href.startsWith("http")) {
          return (
            <a
              key={`${part}-${idx}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={linkClassName}
            >
              {part}
            </a>
          );
        }
        return (
          <Link key={`${part}-${idx}`} href={href} className={linkClassName}>
            {part}
          </Link>
        );
      })}
    </p>
  );
}

export default function HoverPopup() {
  const [popup, setPopup] = useState(DEFAULT_POPUP);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const isMobile = useIsMobile();
  const loggedIn = useAuthStore((s) => s.loggedIn);
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    let cancelled = false;
    let delayTimer;
    let scrollHandler;

    const cleanupListeners = () => {
      if (delayTimer) window.clearTimeout(delayTimer);
      if (scrollHandler) {
        window.removeEventListener("scroll", scrollHandler);
        scrollHandler = undefined;
      }
    };

    const armTrigger = (next) => {
      const { delaySec, scrollPercent } = next.trigger;
      let opened = false;

      const show = () => {
        if (opened || cancelled) return;
        opened = true;
        cleanupListeners();
        setOpen(true);
      };

      const useDelay = delaySec > 0;
      const useScroll = scrollPercent > 0;

      if (!useDelay && !useScroll) {
        show();
        return;
      }

      if (useDelay) {
        delayTimer = window.setTimeout(show, delaySec * 1000);
      }

      if (useScroll) {
        scrollHandler = () => {
          const doc = document.documentElement;
          const max = doc.scrollHeight - window.innerHeight;
          const pct = max <= 0 ? 100 : (window.scrollY / max) * 100;
          if (pct >= scrollPercent) show();
        };
        window.addEventListener("scroll", scrollHandler, { passive: true });
        scrollHandler();
      }
    };

    (async () => {
      await checkAuth().catch(() => false);
      if (cancelled) return;

      try {
        const res = await fetch("/api/popup");
        const data = await res.json();
        if (cancelled) return;

        const next = normalizePopupSettings(data?.popup);
        setPopup(next);
        setReady(true);

        if (!isPopupVisible(next)) return;
        if (next.hideForMembers && useAuthStore.getState().loggedIn) return;
        if (isPopupDismissed(next.version, next.frequency)) return;

        armTrigger(next);
      } catch {
        if (!cancelled) setReady(true);
      }
    })();

    return () => {
      cancelled = true;
      cleanupListeners();
    };
  }, [checkAuth]);

  const handleClose = useCallback(() => {
    setOpen(false);
    markPopupDismissed(popup.version, popup.frequency);
  }, [popup.version, popup.frequency]);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, handleClose]);

  const desktopUrl = popup.imageDesktop.url || popup.image.url;
  const mobileUrl = popup.imageMobile.url || desktopUrl;
  const imageUrl = isMobile ? mobileUrl : desktopUrl;
  const imageAlt = popup.imageDesktop.alt || popup.title || "公告圖片";
  const showButton = popup.button.show && popup.button.label;

  const suppress =
    !ready ||
    !isPopupVisible(popup) ||
    (popup.hideForMembers && loggedIn);

  const colors = popup.colors || DEFAULT_POPUP.colors;
  const typography = popup.typography || DEFAULT_POPUP.typography;

  const content = useMemo(() => {
    const mobileOpts = { mobile: isMobile };
    if (popup.layout === "full") {
      // 滿版：若按鈕選品牌綠就用綠；選白色則白底
      const fullButton = {
        ...popup.button,
        variant: popup.button.variant === "white" ? "white" : "brand",
      };
      return (
        <div className="relative aspect-[9/16] w-full overflow-hidden md:aspect-[16/9]">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={imageAlt}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 920px"
              priority
            />
          ) : (
            <div className="absolute inset-0 bg-[#2a514d]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/25 to-black/10" />
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center text-white transition-opacity hover:opacity-70 md:right-4 md:top-4"
            aria-label="關閉"
          >
            <X size={22} strokeWidth={1.5} />
          </button>
          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-4 px-6 pb-10 pt-16 text-center md:items-start md:gap-5 md:px-12 md:pb-12 md:text-left">
            {popup.title && (
              <h2
                id="hover-popup-title"
                className="max-w-[520px] tracking-[0.02em]"
                style={{
                  color:
                    colors.title === "#222222" ? "#ffffff" : colors.title,
                  ...typeStyle(typography.title, mobileOpts),
                }}
              >
                {popup.title}
              </h2>
            )}
            {popup.body && (
              <p
                className="mx-auto max-w-[420px] whitespace-pre-line tracking-[0.02em] md:mx-0"
                style={{
                  color:
                    colors.body === "#444444"
                      ? "rgba(255,255,255,0.9)"
                      : colors.body,
                  ...typeStyle(typography.body, mobileOpts),
                }}
              >
                {popup.body}
              </p>
            )}
            {showButton && (
              <CtaButton
                label={popup.button.label}
                href={popup.button.href || "/"}
                button={fullButton}
                onNavigate={handleClose}
              />
            )}
          </div>
        </div>
      );
    }

    const imageFirst = isMobile || popup.imagePosition !== "right";

    const imageBlock = (
      <div
        className={`relative w-full overflow-hidden bg-[#eee] ${
          isMobile ? "h-[38%] min-h-[140px] max-h-[220px] shrink-0" : "h-full min-h-[360px]"
        }`}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={imageAlt}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 520px"
            priority
          />
        ) : null}
        {isMobile && (
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center text-white drop-shadow transition-opacity hover:opacity-70"
            aria-label="關閉"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        )}
      </div>
    );

    const textBlock = (
      <div
        className={`relative flex flex-col items-center justify-center gap-3 bg-white px-6 text-center md:gap-3.5 md:px-9 md:py-11 ${
          isMobile ? "min-h-0 flex-1 overflow-y-auto py-6" : "py-9"
        }`}
      >
        {!isMobile && (
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center text-[#222] transition-opacity hover:opacity-70 md:right-4 md:top-4"
            aria-label="關閉"
          >
            <X size={20} strokeWidth={1.5} />
          </button>
        )}

        {popup.title && (
          <h2
            id="hover-popup-title"
            className="max-w-[280px] font-serif tracking-[0.04em] md:max-w-[300px]"
            style={{
              color: colors.title,
              ...typeStyle(typography.title, mobileOpts),
            }}
          >
            {popup.title}
          </h2>
        )}
        {popup.subtitle && (
          <p
            className="tracking-[0.06em]"
            style={{
              color: colors.subtitle,
              ...typeStyle(typography.subtitle, mobileOpts),
            }}
          >
            {popup.subtitle}
          </p>
        )}
        {popup.showGiftIcon && (
          <GiftIcon color={colors.title} scale={popup.giftIconScale} />
        )}
        {popup.body && (
          <p
            className="max-w-[280px] whitespace-pre-line tracking-[0.02em]"
            style={{
              color: colors.body,
              ...typeStyle(typography.body, mobileOpts),
            }}
          >
            {popup.body}
          </p>
        )}
        {showButton && (
          <div className="pt-1">
            <CtaButton
              label={popup.button.label}
              href={popup.button.href || "/"}
              button={popup.button}
              onNavigate={handleClose}
            />
          </div>
        )}
        {popup.footnote && (
          <FootnoteText
            text={popup.footnote}
            links={popup.links}
            color={colors.footnote}
            style={typeStyle(typography.footnote, mobileOpts)}
          />
        )}
      </div>
    );

    return (
      <div
        className={`overflow-hidden bg-white ${
          isMobile
            ? "flex h-[min(78vh,640px)] flex-col"
            : popup.imagePosition === "right"
              ? "grid md:grid-cols-[45%_55%] md:items-stretch"
              : "grid md:grid-cols-[55%_45%] md:items-stretch"
        }`}
      >
        {imageFirst ? (
          <>
            {imageBlock}
            {textBlock}
          </>
        ) : (
          <>
            {textBlock}
            {imageBlock}
          </>
        )}
      </div>
    );
  }, [
    popup,
    colors,
    typography,
    imageUrl,
    imageAlt,
    isMobile,
    showButton,
    handleClose,
  ]);

  if (suppress) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[1400] flex items-center justify-center p-4 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="hover-popup-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="關閉公告"
            onClick={handleClose}
          />

          <motion.div
            className={`relative z-10 w-full overflow-hidden shadow-[0_24px_80px_rgba(0,0,0,0.28)] ${
              popup.layout === "full"
                ? "max-w-[360px] md:max-w-[920px]"
                : "max-w-[420px] md:max-w-[880px]"
            }`}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            {content}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
