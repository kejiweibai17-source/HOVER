"use client";

import { useState, useEffect, useRef } from "react";
import { Link } from "next-view-transitions";
import { useRouter, usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import HoverIcon from "@/components/hover/HoverIcon";
import CartIcon from "@/components/hover/CartIcon";
import WishlistIcon from "@/components/hover/WishlistIcon";
import { useCartStore } from "@/lib/cartStore";
import { useAuthStore } from "@/lib/authStore";
import { useSearchStore, selectSearchOpen } from "@/lib/searchStore";
import HoverLogo from "@/components/hover/HoverLogo";
import MobileNavMenu from "@/components/hover/MobileNavMenu";
import { MobileSearchBar } from "@/components/hover/SearchPanel";
import AnnouncementTicker from "@/components/hover/AnnouncementTicker";
import {
  DEFAULT_ANNOUNCEMENT,
  getActiveAnnouncementItems,
  normalizeAnnouncementSettings,
} from "@/lib/announcementDefaults";
import { FALLBACK_NAV_CATEGORIES } from "@/lib/categoryNav";

const SCROLL_TOP_THRESHOLD = 20;

/**
 * 桌機 icon 光學對齊選單文字（15–16px semibold）。
 * PNG／SVG 有透明留白，繪製尺寸需略大於字級才會看起來一樣高。
 */
const HEADER_ICON = {
  mobile: { box: 32, glyph: 22 },
  desktop: { box: 34, glyph: 22 },
};

function HeaderIconButton({ children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`flex shrink-0 items-center justify-center text-black ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

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
        className="inline-flex items-center text-[15px] xl:text-[16px] font-bold tracking-[0.12em] text-black transition-opacity hover:opacity-50"
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
  const loggedIn = useAuthStore((state) => state.loggedIn);
  const refreshAuth = useAuthStore((state) => state.refreshAuth);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const openSearch = useSearchStore((state) => state.openSearch);
  const closeSearch = useSearchStore((state) => state.closeSearch);
  const searchOpen = useSearchStore(selectSearchOpen);
  const lenis = useLenis();
  const [atTop, setAtTop] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [announcement, setAnnouncement] = useState(DEFAULT_ANNOUNCEMENT);
  const headerRef = useRef(null);
  const mobileSearchInputRef = useRef(null);

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

    fetch("/api/announcement")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setAnnouncement(normalizeAnnouncementSettings(data?.announcement));
      })
      .catch(() => {
        if (!cancelled) setAnnouncement(DEFAULT_ANNOUNCEMENT);
      });

    return () => {
      cancelled = true;
    };
  }, []);

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
    const onScroll = () => {
      const next = window.scrollY <= SCROLL_TOP_THRESHOLD;
      setAtTop((prev) => (prev === next ? prev : next));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
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

  const announcementItems = getActiveAnnouncementItems(announcement);
  const showAnnouncement = !hideAnnouncement && announcementItems.length > 0;

  return (
    <>
      <header
        ref={headerRef}
        className="fixed inset-x-0 top-0 z-[1000]"
        style={{ backgroundColor: bgColor }}
      >
        {/* 手機 — 頂部留白 */}
        <div className="h-5 w-full bg-white md:hidden" aria-hidden />

        {/* 手機 — 公告列 */}
        {!hideAnnouncement && showAnnouncement && (
          <div
            className="flex h-10 w-full items-center justify-center md:hidden"
            style={{
              backgroundColor: announcement.backgroundColor,
              color: announcement.textColor,
            }}
          >
            <AnnouncementTicker
              items={announcementItems}
              intervalMs={announcement.autoplayMs}
              textClassName="text-[12px] tracking-[0.14em]"
            />
          </div>
        )}

        {/* 手機 — 頂列：選單 / Logo / 搜尋+購物車 */}
        <div className="relative flex items-center justify-between px-4 py-2.5 md:hidden">
          <MenuToggle
            open={menuOpen || searchOpen}
            onClick={() => {
              if (searchOpen) closeSearch();
              else setMenuOpen((v) => !v);
            }}
          />
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 text-black"
            aria-label="HOVER"
            onClick={() => setMenuOpen(false)}
          >
            <HoverLogo aria-hidden className="h-8 w-auto" />
          </Link>
          <div className="-mr-0.5 flex items-center justify-end gap-0.5 pr-1">
            <HeaderIconButton
              aria-label="搜尋"
              style={{
                width: HEADER_ICON.mobile.box,
                height: HEADER_ICON.mobile.box,
              }}
              onClick={() => {
                setMenuOpen(false);
                openSearch();
              }}
            >
              <HoverIcon
                name="search"
                size={HEADER_ICON.mobile.glyph}
                alt="搜尋"
              />
            </HeaderIconButton>
            <Link
              href="/cart"
              aria-label={
                cartCount > 0 ? `購物車，${cartCount} 件商品` : "購物車"
              }
              className="relative flex shrink-0 items-center justify-center text-black"
              style={{
                width: HEADER_ICON.mobile.box,
                height: HEADER_ICON.mobile.box,
              }}
              onClick={() => setMenuOpen(false)}
            >
              <CartIcon count={cartCount} size={HEADER_ICON.mobile.glyph} />
            </Link>
          </div>
        </div>

        <MobileSearchBar open={searchOpen} inputRef={mobileSearchInputRef} />

        {/* 桌機 — Logo + nav row */}
        <div
          className={`relative hidden flex-col items-center px-6 md:px-8 transition-all duration-500 ease-out md:flex ${
            atTop ? "pt-2 pb-1" : "pt-3 pb-2"
          }`}
        >
          <Link href="/" className="block text-black" aria-label="HOVER">
            <HoverLogo
              aria-hidden
              className={`w-auto transition-all duration-500 ease-out ${
                atTop ? "h-8 md:h-11" : "h-8 md:h-9"
              }`}
            />
          </Link>

          {/* Nav centered, icons right */}
          <div
            className={`grid w-full grid-cols-[1fr_auto_1fr] items-center px-0 ${
              atTop ? "mt-1 pb-1" : "mt-2 pb-2"
            }`}
          >
            <div aria-hidden className="hidden md:block" />

            <nav className="hidden flex-wrap items-center justify-center gap-x-7 gap-y-2 md:flex lg:gap-x-9 xl:gap-x-10">
              <Link
                href="/products"
                className="text-[15px] xl:text-[16px] font-bold tracking-[0.12em] text-black transition-opacity hover:opacity-50"
              >
                ALL ITEMS
              </Link>
              {categories.map((category) => (
                <CategoryNavItem key={category.id} category={category} />
              ))}
            </nav>

            <div className="col-start-3 flex items-center justify-end gap-0.5 pr-2 md:pr-3">
              <HeaderIconButton
                aria-label="搜尋"
                className="transition-opacity hover:opacity-50"
                style={{
                  width: HEADER_ICON.desktop.box,
                  height: HEADER_ICON.desktop.box,
                }}
                onClick={openSearch}
              >
                <HoverIcon
                  name="search"
                  size={HEADER_ICON.desktop.glyph}
                  alt="搜尋"
                />
              </HeaderIconButton>
              <Link
                href="/account"
                aria-label={loggedIn ? "會員中心（已登入）" : "會員登入"}
                title={loggedIn ? "已登入" : "會員登入"}
                className="relative flex shrink-0 items-center justify-center text-black transition-opacity hover:opacity-50"
                style={{
                  width: HEADER_ICON.desktop.box,
                  height: HEADER_ICON.desktop.box,
                }}
              >
                <HoverIcon
                  name="member"
                  size={HEADER_ICON.desktop.glyph}
                  alt="會員"
                />
                {loggedIn ? (
                  <span
                    className="absolute right-0 top-0 h-1.5 w-1.5 rounded-full bg-[#2a514d] ring-1 ring-white"
                    aria-hidden
                  />
                ) : null}
              </Link>
              <HeaderIconButton
                aria-label="收藏"
                className="relative transition-opacity hover:opacity-50"
                style={{
                  width: HEADER_ICON.desktop.box,
                  height: HEADER_ICON.desktop.box,
                }}
                onClick={async () => {
                  const isLoggedIn = await checkAuth();
                  if (isLoggedIn) {
                    router.push("/account?tab=favorites");
                  } else {
                    router.push(
                      `/login?next=${encodeURIComponent("/account?tab=favorites")}`,
                    );
                  }
                }}
              >
                <WishlistIcon size={HEADER_ICON.desktop.glyph} />
              </HeaderIconButton>
              <Link
                href="/cart"
                aria-label={
                  cartCount > 0 ? `購物車，${cartCount} 件商品` : "購物車"
                }
                className="relative flex shrink-0 items-center justify-center text-black transition-opacity hover:opacity-50"
                style={{
                  width: HEADER_ICON.desktop.box,
                  height: HEADER_ICON.desktop.box,
                }}
              >
                <CartIcon count={cartCount} size={HEADER_ICON.desktop.glyph} />
              </Link>
            </div>
          </div>
        </div>

        {/* 桌機 — 公告列 */}
        {!hideAnnouncement && showAnnouncement && (
          <div
            className="hidden p-1 w-full md:flex"
            style={{
              backgroundColor: announcement.backgroundColor,
              color: announcement.textColor,
            }}
          >
            <AnnouncementTicker
              items={announcementItems}
              intervalMs={announcement.autoplayMs}
            />
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
