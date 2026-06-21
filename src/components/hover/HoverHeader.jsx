"use client";

import { useState, useEffect, useRef } from "react";
import { Link } from "next-view-transitions";
import { useRouter } from "next/navigation";
import { useLenis } from "lenis/react";
import { Search, Heart, ShoppingBag, User } from "lucide-react";
import { useCartStore } from "@/lib/cartStore";
import { useWishlistStore } from "@/lib/wishlistStore";
import { useAuthStore } from "@/lib/authStore";
import HoverLogo from "@/components/hover/HoverLogo";

const NAV_LINKS = [
  { label: "ALL ITEMS", href: "/products" },
  { label: "TOPS", href: "/products?category=tops" },
  { label: "HEADWEAR", href: "/products?category=headwear" },
  { label: "SOCKS", href: "/products?category=socks" },
  { label: "BAGS", href: "/products?category=bags" },
  { label: "OTHERS", href: "/products?category=others" },
];

const SCROLL_TOP_THRESHOLD = 20;

export default function HoverHeader({
  bgColor = "#FFFFFF",
  hideAnnouncement = false,
}) {
  const router = useRouter();
  const cartItems = useCartStore((state) => state.items) || [];
  const cartCount = cartItems.reduce((t, i) => t + (i.qty || 0), 0);
  const wishlistItems = useWishlistStore((state) => state.items);
  const wishlistCount = wishlistItems.length;
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const [atTop, setAtTop] = useState(true);
  const headerRef = useRef(null);

  useLenis((lenis) => {
    const next = lenis.scroll <= SCROLL_TOP_THRESHOLD;
    setAtTop((prev) => (prev === next ? prev : next));
  });

  useEffect(() => {
    setAtTop(window.scrollY <= SCROLL_TOP_THRESHOLD);
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const syncHeight = () => {
      document.documentElement.style.setProperty(
        "--hover-header-height",
        `${el.offsetHeight}px`,
      );
    };

    syncHeight();
    const ro = new ResizeObserver(syncHeight);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <header
      ref={headerRef}
      className="fixed inset-x-0 top-0 z-[1000] transition-[height] duration-500 ease-out"
      style={{ backgroundColor: bgColor }}
    >
      {/* Logo + nav row */}
      <div
        className={`relative flex flex-col items-center px-6 transition-all duration-500 ease-out ${
          atTop ? "pt-4 pb-2" : "pt-5 pb-3"
        }`}
      >
        <Link href="/" className="block text-black" aria-label="HOVER">
          <HoverLogo
            aria-hidden
            className={`w-auto transition-all duration-500 ease-out ${
              atTop ? "h-10 md:h-16" : "h-10 md:h-12"
            }`}
          />
        </Link>

        {/* Nav centered, icons right */}
        <div
          className={`grid w-full grid-cols-[1fr_auto_1fr] items-center px-0 ${
            atTop ? "mt-2 pb-2" : "mt-3 pb-3"
          }`}
        >
          <div aria-hidden className="hidden md:block" />

          <nav className="hidden items-center gap-8 md:flex">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-[13px] tracking-wide text-black transition-opacity hover:opacity-50"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="col-start-3 flex items-center justify-end gap-4">
            <button
              type="button"
              aria-label="搜尋"
              className="text-black hover:opacity-50"
            >
              <Search size={20} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              aria-label="收藏"
              className="relative text-black hover:opacity-50"
              onClick={async () => {
                const isLoggedIn = await checkAuth();
                if (isLoggedIn) {
                  router.push("/account?tab=favorites");
                } else {
                  router.push(`/login?next=${encodeURIComponent("/account?tab=favorites")}`);
                }
              }}
            >
              <Heart size={20} strokeWidth={1.5} />
              {wishlistCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2a514d] px-1 text-[9px] font-bold text-white">
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </button>
            <Link
              href="/cart"
              aria-label="購物車"
              className="relative text-black hover:opacity-50"
            >
              <ShoppingBag size={20} strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2a514d] px-1 text-[9px] font-bold text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
            <Link
              href="/account"
              aria-label="會員"
              className="text-black hover:opacity-50"
            >
              <User size={20} strokeWidth={1.5} />
            </Link>
          </div>
        </div>
      </div>

      {/* Announcement bar */}
      {!hideAnnouncement && (
        <div className="flex h-11 w-full items-center justify-center bg-[#2a514d]">
          <p className="text-[13px] tracking-widest text-[#f0f0f0]">
            全館滿NT$2,000享免運!
          </p>
        </div>
      )}
    </header>
  );
}
