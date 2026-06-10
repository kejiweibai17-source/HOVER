// app/ClientLayout.tsx  — Client Component (no <html>/<body> here)
"use client";

import "yakuhanjp";
import { ViewTransitions } from "next-view-transitions";
import HoverHeader from "@/components/hover/HoverHeader";
import HoverFooter from "@/components/hover/HoverFooter";
import LenisWrapper from "@/components/LenisWrapper";
import { useEffect } from "react";
import CartDrawer from "@/components/cart/CartDrawer";
import AOS from "aos";
import "aos/dist/aos.css";
import { usePathname } from "next/navigation";

function ScrollToTopOnNav() {
  const pathname = usePathname();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [pathname]);
  return null;
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    AOS.init({ duration: 800, once: false });
  }, []);

  return (
    <LenisWrapper>
      <ViewTransitions>
        <ScrollToTopOnNav />

        {/* Global HOVER header — fixed, always visible */}
        <HoverHeader />

        {/* Page content — offset for fixed header height (116px) */}
        <main className="bg-hover-bg pt-[var(--hover-header-height,116px)] transition-[padding-top] duration-500 ease-out">
          {children}
        </main>

        <CartDrawer />

        {/* Global HOVER footer */}
        <HoverFooter />
      </ViewTransitions>
    </LenisWrapper>
  );
}
