"use client";

import { useState, useEffect, useRef } from "react";
import { Link } from "next-view-transitions";
import { useRouter, usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import HoverIcon from "@/components/hover/HoverIcon";
import WishlistIcon from "@/components/hover/WishlistIcon";
import { useCartStore } from "@/lib/cartStore";
import { useWishlistStore } from "@/lib/wishlistStore";
import { useAuthStore } from "@/lib/authStore";
import { useSearchStore, selectSearchOpen } from "@/lib/searchStore";
import HoverLogo from "@/components/hover/HoverLogo";
import MobileNavMenu from "@/components/hover/MobileNavMenu";
import { FALLBACK_NAV_CATEGORIES } from "@/lib/categoryNav";

const SCROLL_TOP_THRESHOLD = 20;

function MenuToggle({ open, onClick }) {
  return (
    <button
      type="button"
      aria-label={open ? "關閉選單" : "開啟選單"}
      aria-expanded={open}
      onClick={onClick}
      className="flex h-10 w-10 items-center justify-center text-black"
    >
      {open ? (
        <span className="text-[22px] font-light leading-none">×</span>
      ) : (
        <span className="flex flex-col gap-[6px]" aria-hidden>
          <span className="block h-px w-5 bg-black" />
          <span className="block h-px w-5 bg-black" />
        </span>
      )}
    </button>
  );
}

function CategoryNavItem({ category }) {
  const hasChildren = category.children.length > 0;

  return (
    <div className="group relative">
      <Link
        href={category.href}
        className="inline-flex items-center text-[13px] tracking-wide text-black transition-opacity hover:opacity-50"
      >
        {category.label}
      </Link>

      {hasChildren && (
        <div
          className="pointer-events-none absolute left-1/2 top-full z-50 min-w-[160px] -translate-x-1/2 pt-3 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100"
          role="menu"
          aria-label={`${category.label} 子分類`}
        >
          <div className="border border-[#e8e8e8] bg-white py-2 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
            {category.children.map((child) => (
              <Link
                key={child.id}
                href={child.href}
                role="menuitem"
                className="block px-5 py-2.5 text-[12px] tracking-[0.06em] text-[#333] transition-colors hover:bg-[#f5f5f5] hover:text-[#2a514d]"
              >
                {child.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HoverHeader({
  bgColor = "#FFFFFF",
  hideAnnouncement = false,
}) {
  const router = useRouter();
  const pathname = usePathname();
  const cartItems = useCartStore((state) => state.items) || [];
  const cartCount = cartItems.reduce((t, i) => t + (i.qty || 0), 0);
  const wishlistItems = useWishlistStore((state) => state.items);
  const wishlistCount = wishlistItems.length;
  const loggedIn = useAuthStore((state) => state.loggedIn);
  const authUser = useAuthStore((state) => state.user);
  const refreshAuth = useAuthStore((state) => state.refreshAuth);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const openSearch = useSearchStore((state) => state.openSearch);
  const closeSearch = useSearchStore((state) => state.closeSearch);
  const searchOpen = useSearchStore(selectSearchOpen);
  const lenis = useLenis();
  const [atTop, setAtTop] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const headerRef = useRef(null);

  useEffect(() => {
    refreshAuth();
  }, [pathname, refreshAuth]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (searchOpen) setMenuOpen(false);
  }, [searchOpen]);

  useEffect(() => {
    if (menuOpen) closeSearch();
  }, [menuOpen, closeSearch]);

  useEffect(() => {
    if (!menuOpen) return;

    const scrollY = window.scrollY;
    lenis?.stop();
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      document.body.style.overflow = "";
      lenis?.start();
      window.scrollTo(0, scrollY);
    };
  }, [menuOpen, lenis]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data?.categories)) return;
        setCategories(
          data.categories.length > 0
            ? data.categories
            : FALLBACK_NAV_CATEGORIES,
        );
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

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
  }, [hideAnnouncement]);

  return (
    <>
    <header
      ref={headerRef}
      className="fixed inset-x-0 top-0 z-[1000]"
      style={{ backgroundColor: bgColor }}
    >
      {/* 手機 — 公告列置頂 */}
      {!hideAnnouncement && (
        <div className="flex h-10 w-full items-center justify-center bg-[#2a514d] md:hidden">
          <p className="text-[12px] tracking-[0.14em] text-[#f0f0f0]">
            全館滿NT$2,000享免運!
          </p>
        </div>
      )}

      {/* 手機 — 頂列：選單 / Logo / 搜尋+購物車 */}
      <div className="relative flex items-center justify-between px-4 py-2.5 md:hidden">
        <MenuToggle open={menuOpen} onClick={() => setMenuOpen((v) => !v)} />
        <Link
          href="/"
          className="absolute left-1/2 -translate-x-1/2 text-black"
          aria-label="HOVER"
          onClick={() => setMenuOpen(false)}
        >
          <HoverLogo aria-hidden className="h-8 w-auto" />
        </Link>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label="搜尋"
            className="shrink-0 p-0.5 text-black"
            onClick={() => {
              setMenuOpen(false);
              openSearch();
            }}
          >
            <HoverIcon name="search" size={44} alt="搜尋" />
          </button>
          <Link
            href="/cart"
            aria-label="購物車"
            className="relative shrink-0 p-0.5 text-black"
            onClick={() => setMenuOpen(false)}
          >
            <HoverIcon name="cart" size={44} alt="購物車" />
            {cartCount > 0 && (
              <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#2a514d] px-0.5 text-[9px] font-bold text-white">
                {cartCount > 99 ? "99+" : cartCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* 桌機 — Logo + nav row */}
      <div
        className={`relative hidden flex-col items-center px-6 transition-all duration-500 ease-out md:flex ${
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

          <nav className="hidden flex-wrap items-center justify-center gap-x-4 gap-y-2 md:flex lg:gap-x-5">
            <Link
              href="/products"
              className="text-[13px] tracking-wide text-black transition-opacity hover:opacity-50"
            >
              ALL ITEMS
            </Link>
            {categories.map((category) => (
              <CategoryNavItem key={category.id} category={category} />
            ))}
          </nav>

          <div className="col-start-3 flex items-center justify-end gap-2 md:gap-2.5">
            <button
              type="button"
              aria-label="搜尋"
              className="shrink-0 p-0.5 text-black transition-opacity hover:opacity-50"
              onClick={openSearch}
            >
              <HoverIcon name="search" size={56} alt="搜尋" />
            </button>
            <button
              type="button"
              aria-label="收藏"
              className="relative shrink-0 p-0.5 text-black transition-opacity hover:opacity-50"
              onClick={async () => {
                const isLoggedIn = await checkAuth();
                if (isLoggedIn) {
                  router.push("/account?tab=favorites");
                } else {
                  router.push(`/login?next=${encodeURIComponent("/account?tab=favorites")}`);
                }
              }}
            >
              <WishlistIcon size={56} />
              {wishlistCount > 0 && (
                <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2a514d] px-1 text-[10px] font-bold text-white">
                  {wishlistCount > 99 ? "99+" : wishlistCount}
                </span>
              )}
            </button>
            <Link
              href="/cart"
              aria-label="購物車"
              className="relative shrink-0 p-0.5 text-black transition-opacity hover:opacity-50"
            >
              <HoverIcon name="cart" size={56} alt="購物車" />
              {cartCount > 0 && (
                <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#2a514d] px-1 text-[10px] font-bold text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
            <Link
              href="/account"
              aria-label={loggedIn && authUser ? `Hi ${authUser.name}` : "會員"}
              className="flex shrink-0 items-center gap-1.5 text-black hover:opacity-50"
            >
              {loggedIn && authUser ? (
                <>
                  {authUser.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={authUser.avatarUrl}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover ring-1 ring-black/10"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2a514d] text-[11px] font-bold text-white">
                      {authUser.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                  <span className="hidden max-w-[88px] truncate text-[12px] font-medium tracking-wide lg:inline">
                    Hi {authUser.name}
                  </span>
                </>
              ) : (
                <HoverIcon name="member" size={56} alt="會員" />
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* 桌機 — 公告列 */}
      {!hideAnnouncement && (
        <div className="hidden h-11 w-full items-center justify-center bg-[#2a514d] md:flex">
          <p className="text-[13px] tracking-widest text-[#f0f0f0]">
            全館滿NT$2,000享免運!
          </p>
        </div>
      )}
    </header>

    <MobileNavMenu
      open={menuOpen}
      onClose={() => setMenuOpen(false)}
      categories={categories}
      loggedIn={loggedIn}
      checkAuth={checkAuth}
    />
    </>
  );
}
