"use client";

import { useEffect, useState } from "react";
import { Link } from "next-view-transitions";
import { AnimatePresence, motion } from "framer-motion";

const EASE = [0.22, 1, 0.36, 1];

export default function AnnouncementTicker({
  items = [],
  intervalMs = 4000,
  className = "",
  textClassName = "text-[12px] tracking-[0.14em] md:text-[12px] md:tracking-widest",
}) {
  const [index, setIndex] = useState(0);
  const active = items.filter((item) => item.text?.trim());

  useEffect(() => {
    setIndex(0);
  }, [items]);

  useEffect(() => {
    if (active.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setIndex((prev) => (prev + 1) % active.length);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [active.length, intervalMs]);

  if (!active.length) return null;

  const current = active[index % active.length];
  const href = current.href?.trim();

  const inner = (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={`${current.id}-${index}`}
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "-100%", opacity: 0 }}
        transition={{ duration: 0.42, ease: EASE }}
        className={`block truncate ${textClassName}`}
      >
        {current.text}
      </motion.span>
    </AnimatePresence>
  );

  return (
    <div
      className={`relative flex  h-full w-full items-center justify-center overflow-hidden ${className}`}
    >
      {href && href !== "#" ? (
        <Link
          href={href}
          className="flex h-full w-full items-center justify-center my-3 px-4  transition-opacity hover:opacity-80"
        >
          {inner}
        </Link>
      ) : (
        <div className="flex h-full w-full items-center justify-center px-4">
          {inner}
        </div>
      )}
    </div>
  );
}
