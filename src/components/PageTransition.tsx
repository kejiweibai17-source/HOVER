"use client";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const prefersReduce = useReducedMotion();

  const variants = {
    initial: prefersReduce ? { opacity: 0 } : { opacity: 0, y: 16 },
    animate: prefersReduce ? { opacity: 1 } : { opacity: 1, y: 0 },
    exit: prefersReduce ? { opacity: 0 } : { opacity: 0, y: 16 },
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.main
        key={pathname} // ← 路由變更時重新掛載，才能觸發出/入場
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={{ duration: 0.35, ease: "easeInOut" }}
        className="min-h-screen overflow-hidden"
      >
        {children}
      </motion.main>
    </AnimatePresence>
  );
}
