"use client";

import { useEffect, useState } from "react";
import { useLenis } from "lenis/react";
import HoverIcon from "@/components/hover/HoverIcon";

const SHOW_AFTER = 320;

export default function GoTopButton() {
  const [visible, setVisible] = useState(false);

  useLenis((lenis) => {
    const next = lenis.scroll > SHOW_AFTER;
    setVisible((prev) => (prev === next ? prev : next));
  });

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > SHOW_AFTER);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="回到頂部"
      className="fixed bottom-8 right-5 z-[900] flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0_2px_14px_rgba(0,0,0,0.14)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_18px_rgba(0,0,0,0.18)] md:bottom-10 md:right-8 md:h-14 md:w-14"
    >
      <HoverIcon name="goTop" size={36} className="md:!h-10 md:!w-10" alt="" />
    </button>
  );
}
