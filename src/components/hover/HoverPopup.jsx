"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import {
  DEFAULT_POPUP,
  getPopupDismissKey,
  isPopupVisible,
  normalizePopupSettings,
} from "@/lib/popupDefaults";

function PopupButton({ label, href }) {
  const className =
    "inline-flex min-w-[160px] items-center justify-center bg-[#2a514d] px-8 py-3.5 text-[12px] tracking-[0.16em] text-white transition-opacity hover:opacity-85 md:text-[13px]";

  if (href.startsWith("http")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {label}
    </Link>
  );
}

export default function HoverPopup() {
  const [popup, setPopup] = useState(DEFAULT_POPUP);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/popup")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const next = normalizePopupSettings(data?.popup);
        setPopup(next);
        setReady(true);

        if (!isPopupVisible(next)) return;

        const dismissKey = getPopupDismissKey(next.version);
        if (typeof window !== "undefined" && sessionStorage.getItem(dismissKey)) {
          return;
        }

        setOpen(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    if (typeof window !== "undefined") {
      sessionStorage.setItem(getPopupDismissKey(popup.version), "1");
    }
  }, [popup.version]);

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

  if (!ready || !isPopupVisible(popup)) return null;

  const { title, body, image, button } = popup;
  const showButton = button.show && button.label;

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
            className="relative z-10 w-full max-w-[420px] overflow-hidden bg-white shadow-[0_24px_80px_rgba(0,0,0,0.28)] md:max-w-[480px]"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={handleClose}
              className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-[#222] shadow-sm transition-opacity hover:opacity-70 md:right-4 md:top-4"
              aria-label="關閉"
            >
              <X size={18} strokeWidth={1.5} />
            </button>

            {image.url && (
              <div className="relative aspect-[16/10] w-full bg-[#f5f5f5]">
                <Image
                  src={image.url}
                  alt={image.alt || title || "公告圖片"}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 90vw, 480px"
                  priority
                />
              </div>
            )}

            <div className="px-6 py-7 text-center md:px-8 md:py-8">
              {title && (
                <h2
                  id="hover-popup-title"
                  className="mb-3 text-[18px] font-normal tracking-[0.1em] text-[#222] md:text-[20px]"
                >
                  {title}
                </h2>
              )}

              {body && (
                <p className="mb-6 whitespace-pre-line text-[13px] leading-[1.8] tracking-[0.04em] text-[#666] md:text-[14px]">
                  {body}
                </p>
              )}

              {showButton && (
                <PopupButton label={button.label} href={button.href || "/"} />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
