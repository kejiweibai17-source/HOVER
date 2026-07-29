"use client";

import { useEffect, useState } from "react";
import { useLenis } from "lenis/react";
import HoverIcon from "@/components/hover/HoverIcon";

const SHOW_AFTER = 320;

export default function GoTopButton() {
  const [visible, setVisible] = useState(false);

  // Lenis 頁用 callback；原生捲動頁用 window scroll
  useLenis((lenis) => {
    const next = lenis.scroll > SHOW_AFTER;
    setVisible((prev) => (prev === next ? prev : next));
  });

  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > SHOW_AFTER;
      setVisible((prev) => (prev === next ? prev : next));
    };
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
      className="fixed bottom-8 right-2 z-[900] p-0 transition-opacity duration-300 hover:opacity-80 md:bottom-10 md:right-4"
    >
      <HoverIcon name="goTop" size={64} className="md:!h-20 md:!w-20" alt="" />
    </button>
  );
}
