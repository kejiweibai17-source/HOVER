"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "next-view-transitions";
import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
// ✅ 修正 1：加上大括號作具名匯入
import { useCartStore } from "@/lib/cartStore";

// ============================================================================
// 子組件區塊
// ============================================================================

/** * 🚀 頂部公告輪播組件 */
function TopAnnouncementBar({ isVisible }) {
  const announcements = [
    { text: "- 全館消費滿 NT$1,500 即享免運優惠 -", color: "#f58a9c" },
    { text: "- 新會員註冊立即送 NT$50 購物金 -", color: "#f58a9c" },
    { text: "- 會員生日當月享專屬禮金 NT$100 起 -", color: "#f58a9c" },
    {
      text: "- UFLOW 推薦計畫：親友首單完成，即獲 NT$200 抵用金 -",
      color: "#f58a9c",
    },
  ];

  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % announcements.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [announcements.length]);

  return (
    <div
      className={`w-full bg-[#f58a9c] transition-all duration-300 ease-in-out overflow-hidden ${
        isVisible
          ? "h-9 opacity-100"
          : "max-md:h-9 max-md:opacity-100 md:h-0 md:opacity-0"
      }`}
    >
      <div className="relative h-9 w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="flex h-full w-full items-center justify-center px-4 text-center"
          >
            <span className="text-[11px] font-bold tracking-widest text-white md:text-xs">
              {announcements[index].text}
            </span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** * 漢堡選單按鈕 */
function MenuToggleButton({ open, onClick, className = "", buttonRef }) {
  const spring = { type: "spring", stiffness: 260, damping: 20 };
  return (
    <motion.button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-label={open ? "關閉選單" : "開啟選單"}
      aria-expanded={open}
      whileTap={{ scale: 0.95 }}
      className={`inline-flex items-center justify-center focus:outline-none transition-colors ${className}`}
    >
      <motion.svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        initial={false}
        animate={open ? "open" : "closed"}
        className="text-slate-900"
      >
        <motion.line
          x1="3"
          y1="6"
          x2="21"
          y2="6"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="square"
          variants={{
            closed: { translateY: 0, rotate: 0, x1: 3, x2: 21 },
            open: { translateY: 6, rotate: 45, x1: 5, x2: 19 },
          }}
          transition={spring}
          style={{ originX: "50%", originY: "50%" }}
        />
        <motion.line
          x1="3"
          y1="12"
          x2="21"
          y2="12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="square"
          variants={{
            closed: { opacity: 1, x1: 3, x2: 21 },
            open: { opacity: 0, x1: 12, x2: 12 },
          }}
          transition={{ duration: 0.18 }}
        />
        <motion.line
          x1="3"
          y1="18"
          x2="21"
          y2="18"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="square"
          variants={{
            closed: { translateY: 0, rotate: 0, x1: 3, x2: 21 },
            open: { translateY: -6, rotate: -45, x1: 5, x2: 19 },
          }}
          transition={spring}
          style={{ originX: "50%", originY: "50%" }}
        />
      </motion.svg>
    </motion.button>
  );
}

/** * 購物車按鈕 */
function CartButton({ count = 0, onClick }) {
  return (
    <Link
      href="/cart"
      onClick={onClick}
      className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-800 hover:bg-slate-100 transition-colors"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path
          d="M6 6h15l-1.5 9h-12L6 6zm0 0L5 3H3"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9" cy="20" r="1.5" fill="currentColor" />
        <circle cx="17" cy="20" r="1.5" fill="currentColor" />
      </svg>
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            key="badge"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-rose-600 px-1.5 text-center text-[10px] font-bold leading-5 text-white shadow-sm"
          >
            {count > 99 ? "99+" : count}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );
}

/** * 手機版側邊選單 */
function MobileDrawer({
  open,
  onClose,
  isLoggedIn,
  user,
  onLogout,
  navLinks = [],
  cartCount = 0,
}) {
  const panelRef = useRef(null);
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="mb-overlay"
            className="fixed inset-0 z-[1199] bg-black/40 backdrop-blur-sm md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.aside
            key="mb-drawer"
            ref={panelRef}
            className="fixed left-0 top-0 z-[1200] flex h-full w-[85%] max-w-sm flex-col bg-white shadow-2xl md:hidden"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
          >
            <div className="flex items-center justify-between px-4 py-4 bg-white border-b">
              <img
                src="/images/logo-04.png"
                alt="LOGO"
                className="h-8 w-auto"
              />
              <MenuToggleButton open onClick={onClose} className="h-9 w-9" />
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              <nav className="px-2">
                {navLinks.map((it) => (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={onClose}
                    className="block rounded-lg px-4 py-3 text-[15px] font-medium text-slate-800 hover:bg-slate-50"
                  >
                    {it.label}
                  </Link>
                ))}
              </nav>
              <div className="mt-4 px-2 border-t pt-4">
                <Link
                  href="/cart"
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-lg"
                >
                  <span className="font-medium text-slate-800">
                    購物車 ({cartCount})
                  </span>
                </Link>
                <Link
                  href={isLoggedIn ? "/account" : "/login"}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 rounded-lg"
                >
                  <span className="font-medium text-slate-800">
                    {isLoggedIn ? "會員中心" : "登入/註冊"}
                  </span>
                </Link>
              </div>
            </div>
            {isLoggedIn && (
              <div className="border-t p-4 bg-slate-50 text-sm flex items-center justify-between">
                <span className="text-slate-600 truncate">{user?.name}</span>
                <button
                  onClick={onLogout}
                  className="text-rose-500 font-medium"
                >
                  登出
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/** * 桌面版會員選單 */
function UserMenu({ isLoggedIn, user, onLogin, onLogout }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 text-slate-800 hover:text-slate-600 transition-colors group h-full py-2"
      >
        <span className="text-[13px] font-bold tracking-wide">
          {isLoggedIn ? user.name || "會員" : "會員登入"}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          className={`transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        >
          <path
            d="M6 9l6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <div className="absolute right-0 top-full pt-4 z-[1500]">
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="w-48 rounded-lg border border-slate-100 bg-white shadow-xl p-1 relative"
            >
              <div className="absolute -top-1.5 right-6 w-3 h-3 bg-white border-t border-l border-slate-100 transform rotate-45"></div>

              {!isLoggedIn ? (
                <button
                  onClick={onLogin}
                  className="block w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 rounded-md font-bold text-slate-700 transition-colors"
                >
                  登入 / 註冊
                </button>
              ) : (
                <>
                  <Link
                    href="/account"
                    onClick={() => setOpen(false)}
                    className="block px-4 py-2.5 text-sm hover:bg-slate-50 rounded-md font-bold text-slate-700 transition-colors"
                  >
                    我的帳戶
                  </Link>
                  <button
                    onClick={onLogout}
                    className="block w-full text-left px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 rounded-md font-bold transition-colors mt-1"
                  >
                    登出
                  </button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// 主組件
// ============================================================================

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const openerRef = useRef(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState({ name: "", email: "", avatarUrl: "" });
  const [isScrolled, setIsScrolled] = useState(false);

  // ✅ 修正 2：對齊 Store 中正確的狀態屬性 `items` 和 `qty`
  const cartItems = useCartStore((state) => state.items) || [];
  const cartCount = cartItems.reduce(
    (total, item) => total + (item.qty || 0),
    0,
  );

  // 🚀 狀態控制：主導覽列隱藏、粉色公告欄顯示
  const [hidden, setHidden] = useState(false);
  const [showPinkBar, setShowPinkBar] = useState(false);
  const lastScrollY = useRef(0);

  const pathname = usePathname();

  const toggleMenu = useCallback(() => setMenuOpen((v) => !v), []);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const refreshAuth = useCallback(async () => {
    try {
      const r = await fetch("/api/account/profile", {
        cache: "no-store",
        credentials: "include",
      });
      const js = await r.json();
      if (js.loggedIn && js.customer) {
        const display =
          js.customer.first_name?.trim() ||
          js.customer.username ||
          js.customer.email?.split("@")[0] ||
          "會員";
        setIsLoggedIn(true);
        setUser({ name: display, email: js.customer.email, avatarUrl: "" });
      } else {
        setIsLoggedIn(false);
        setUser({ name: "", email: "", avatarUrl: "" });
      }
    } catch {
      setIsLoggedIn(false);
    }
  }, []);

  useEffect(() => {
    refreshAuth();
  }, [pathname, refreshAuth]);

  // 🚀 完美滾動偵測邏輯
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // 判斷是否加上陰影
      setIsScrolled(currentScrollY > 10);

      if (currentScrollY <= 10) {
        // 1. 到達最頂部：顯示主導覽列，收回粉色公告
        setHidden(false);
        setShowPinkBar(false);
      } else if (currentScrollY > lastScrollY.current) {
        // 2. 往下滾動：超過 50px 隱藏主導覽列，絕對不顯示粉色公告
        if (currentScrollY > 50) {
          setHidden(true);
        }
        setShowPinkBar(false);
      } else if (currentScrollY < lastScrollY.current) {
        // 3. 往上滾動：顯示主導覽列，並且展開粉色公告
        setHidden(false);
        setShowPinkBar(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [menuOpen]);

  const handleLogin = () => {
    const next = typeof window !== "undefined" ? window.location.pathname : "/";
    window.location.href = `/login?next=${encodeURIComponent(next)}`;
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.reload();
    }
  };

  const hotItems = [
    {
      title: "鎂鎂香蜂草",
      href: "/products/gaba-magnesium-lemon-balm",
      imageUrl: "/images/GABA鎂鎂香蜂草.png",
    },
    {
      title: "維他菌合生元",
      href: "/products/synbiotics",
      imageUrl: "/images/維他菌-合生元.png",
    },
    {
      title: "冰晶芙蓉",
      href: "/products/肽晶芙蓉",
      imageUrl: "/images/00912.png",
    },
  ];

  const navLinks = [
    { label: "關於我們", href: "/about" },
    { label: "品牌資訊", href: "/brand" },
    { label: "熱銷產品", href: "/products" },
    { label: "保健知識", href: "/blog" },
    { label: "聯絡我們", href: "/contact" },
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-[1000] w-full bg-white border-b border-gray-100 transition-all duration-300 ease-in-out ${
          hidden ? "max-md:translate-y-0 md:-translate-y-full" : "translate-y-0"
        } ${isScrolled ? "shadow-md" : "shadow-none"}`}
      >
        <TopAnnouncementBar isVisible={showPinkBar} />

        <div className="mx-auto flex w-full justify-between px-4 lg:px-8">
          <div className="flex items-center py-1">
            <Link href="/" className="flex items-center gap-3 group">
              <img
                src="/images/logo-04.png"
                className="h-12 w-auto object-contain transition-transform group-hover:scale-105"
                alt="UFLOW LOGO"
              />
              <div className="hidden xl:block">
                <p className="text-xl font-bold tracking-widest text-slate-900 leading-none uppercase">
                  Uflow
                </p>
                <p className="text-[10px] tracking-[0.2em] text-slate-500 font-serif mt-1 italic">
                  Enjoy Healthy Life!
                </p>
              </div>
            </Link>
          </div>

          <div className="hidden md:flex flex-col items-end justify-center py-2">
            <div className="flex items-center gap-6 mb-3">
              <Link
                href="/contact"
                className="text-[12px] font-bold text-slate-600 hover:text-black flex items-center gap-1 transition-colors"
              >
                聯絡我們 <span className="text-[8px]">▼</span>
              </Link>
              <div className="flex items-center gap-1 border border-slate-300 rounded-full px-3 py-1 bg-white">
                <span className="text-[14px]">∞</span>
                <span className="text-[11px] font-bold text-slate-700">
                  UFLOW FAMILY
                </span>
              </div>
              <Link
                href="/products"
                className="bg-[#FCD800] hover:bg-[#ffe033] text-black h-[44px] px-8 flex items-center justify-center gap-3 transition-colors relative group"
              >
                <div className="flex flex-col items-start leading-none">
                  <span className="text-[14px] font-extrabold tracking-wider">
                    ONLINE SHOP
                  </span>
                  <span className="text-[9px] font-medium tracking-wide">
                    熱銷產品情報
                  </span>
                </div>
                <div className="bg-white rounded-full w-5 h-5 flex items-center justify-center group-hover:translate-x-1 transition-transform shadow-sm">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
              </Link>
            </div>

            <div className="flex items-center gap-8">
              <nav className="flex items-center">
                {navLinks.map((link, idx) => (
                  <React.Fragment key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[14px] font-bold text-slate-800 hover:text-[#f58a9c] tracking-wider transition-colors px-2 relative group"
                    >
                      {link.label}
                    </Link>
                    {idx !== navLinks.length - 1 && (
                      <div className="w-[1px] h-3 bg-slate-300 mx-3"></div>
                    )}
                  </React.Fragment>
                ))}
              </nav>

              <div className="flex items-center gap-4 pl-4 border-l border-slate-200">
                <UserMenu
                  isLoggedIn={isLoggedIn}
                  user={user}
                  onLogin={handleLogin}
                  onLogout={handleLogout}
                />
                <CartButton count={cartCount} />
                <MenuToggleButton
                  open={menuOpen}
                  onClick={toggleMenu}
                  buttonRef={openerRef}
                  className="ml-2"
                />
              </div>
            </div>
          </div>

          <div className="flex md:hidden items-center gap-3">
            <CartButton count={cartCount} />
            <MenuToggleButton
              open={menuOpen}
              onClick={toggleMenu}
              buttonRef={openerRef}
            />
          </div>
        </div>
      </header>

      <MobileDrawer
        open={menuOpen}
        onClose={closeMenu}
        isLoggedIn={isLoggedIn}
        user={user}
        onLogout={handleLogout}
        navLinks={navLinks}
        cartCount={cartCount}
      />

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="overlay"
              className="fixed inset-0 z-[1199] bg-black/40 backdrop-blur-sm hidden md:block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMenu}
            />
            <motion.section
              key="full-mega"
              className="fixed left-0 top-0 z-[1200] hidden h-[80vh] w-full bg-white md:block shadow-2xl overflow-hidden"
              initial={{ clipPath: "inset(0 0 100% 0)" }}
              animate={{ clipPath: "inset(0 0 0% 0)" }}
              exit={{ clipPath: "inset(0 0 100% 0)" }}
              transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b px-10 py-6 bg-white">
                <p className="text-sm font-medium text-slate-500 tracking-widest uppercase">
                  Explore Uflow Life
                </p>
                <MenuToggleButton
                  open
                  onClick={closeMenu}
                  className="h-10 w-10"
                />
              </div>

              <div className="mx-auto h-full max-w-[1200px] overflow-y-auto px-10 pb-20 pt-10">
                <div className="mb-12">
                  <h3 className="mb-8 text-xl font-bold text-slate-900 flex items-center gap-3">
                    <span className="h-1 w-8 bg-[#FCD800]"></span>人氣熱銷推薦
                  </h3>
                  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
                    {hotItems.map((it, i) => (
                      <motion.div
                        key={it.title}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <Link
                          href={it.href}
                          onClick={closeMenu}
                          className="group block overflow-hidden rounded-2xl bg-slate-50 hover:bg-white hover:shadow-xl transition-all duration-500"
                        >
                          <div className="aspect-square w-full overflow-hidden p-8">
                            <img
                              src={it.imageUrl}
                              alt={it.title}
                              className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-110"
                            />
                          </div>
                          <div className="p-6 border-t border-slate-100 flex justify-between items-center">
                            <span className="text-lg font-bold text-slate-900 group-hover:text-[#f58a9c] transition-colors">
                              {it.title}
                            </span>
                            <div className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center group-hover:bg-[#FCD800] group-hover:border-[#FCD800] transition-all">
                              <ChevronRight size={16} />
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-12 pt-12 border-t border-slate-100">
                  <div>
                    <h4 className="font-bold text-slate-900 mb-5 tracking-widest uppercase text-sm">
                      Brand Store
                    </h4>
                    <ul className="space-y-4 text-sm font-medium text-slate-500">
                      <li>
                        <Link
                          href="/brand"
                          onClick={closeMenu}
                          className="hover:text-[#f58a9c]"
                        >
                          品牌故事
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/brand"
                          onClick={closeMenu}
                          className="hover:text-[#f58a9c]"
                        >
                          核心理念
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/about"
                          onClick={closeMenu}
                          className="hover:text-[#f58a9c]"
                        >
                          關於我們
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-5 tracking-widest uppercase text-sm">
                      Customer Care
                    </h4>
                    <ul className="space-y-4 text-sm font-medium text-slate-500">
                      <li>
                        <Link
                          href="/qa"
                          onClick={closeMenu}
                          className="hover:text-[#f58a9c]"
                        >
                          常見問題 QA
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/shipping"
                          onClick={closeMenu}
                          className="hover:text-[#f58a9c]"
                        >
                          配送及付款方式
                        </Link>
                      </li>
                      <li>
                        <Link
                          href="/shipping"
                          onClick={closeMenu}
                          className="hover:text-[#f58a9c]"
                        >
                          退換貨政策
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
