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
      className="fixed bottom-8 right-2 z-[900] p-0 transition-all duration-300 hover:-translate-y-0.5 hover:opacity-80 md:bottom-10 md:right-4"
    >
      <HoverIcon name="goTop" size={64} className="md:!h-20 md:!w-20" alt="" />
    </button>
  );
}
