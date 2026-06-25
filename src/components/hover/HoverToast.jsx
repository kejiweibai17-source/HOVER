"use client";

import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useToastStore } from "@/lib/toastStore";
import WishlistIcon from "@/components/hover/WishlistIcon";

const AUTO_HIDE_MS = 3200;

export default function HoverToast() {
  const message = useToastStore((s) => s.message);
  const hide = useToastStore((s) => s.hide);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(hide, AUTO_HIDE_MS);
    return () => window.clearTimeout(timer);
  }, [message, hide]);

  return (
    <AnimatePresence>
      {message ? (
        <motion.div
          key={message}
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.96 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="fixed bottom-24 right-5 z-[920] flex max-w-[min(92vw,360px)] items-center gap-3 rounded-sm border border-black/8 bg-white px-4 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.12)] md:bottom-28 md:right-8 md:px-5 md:py-3.5"
        >
          <WishlistIcon active size={28} className="shrink-0" />
          <p className="text-[13px] leading-snug tracking-[0.04em] text-black md:text-[14px]">
            {message}
          </p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
