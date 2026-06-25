"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import WishlistIcon from "@/components/hover/WishlistIcon";
import HoverIcon from "@/components/hover/HoverIcon";
import { formatSearchPrice } from "@/lib/searchProducts";

const DEBOUNCE_MS = 280;

export default function MobileNavMenu({
  open,
  onClose,
  categories,
  loggedIn,
  checkAuth,
}) {
  const router = useRouter();
  const searchInputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const runSearch = useCallback(async (value) => {
    const q = value.trim();
    abortRef.current?.abort();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(q)}&limit=8`,
        { signal: controller.signal },
      );
      const data = await res.json();
      if (!controller.signal.aborted) {
        setResults(Array.isArray(data?.results) ? data.results : []);
      }
    } catch (err) {
      if (err?.name !== "AbortError" && !controller.signal.aborted) {
        setResults([]);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setLoading(false);
      abortRef.current?.abort();
      return;
    }

    const timer = window.setTimeout(() => searchInputRef.current?.focus(), 150);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => runSearch(query), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, open, runSearch]);

  const handleFavorites = async () => {
    onClose();
    const isLoggedIn = await checkAuth();
    if (isLoggedIn) {
      router.push("/account?tab=favorites");
    } else {
      router.push(`/login?next=${encodeURIComponent("/account?tab=favorites")}`);
    }
  };

  const handleAccount = () => {
    onClose();
    router.push(loggedIn ? "/account" : "/login");
  };

  const linkClass =
    "block border-b border-[#e8e8e8] px-6 py-4 text-[14px] font-medium tracking-[0.18em] text-black transition-colors hover:bg-[#fafafa]";

  const trimmedQuery = query.trim();
  const showResults = trimmedQuery.length > 0;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="關閉選單"
            className="fixed inset-x-0 bottom-0 z-[999] bg-black/40 md:hidden"
            style={{ top: "var(--hover-header-height, 88px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.nav
            aria-label="手機選單"
            className="fixed inset-x-0 z-[1001] flex max-h-[calc(100dvh-var(--hover-header-height,88px))] flex-col overflow-hidden border-t border-[#e8e8e8] bg-white md:hidden"
            style={{ top: "var(--hover-header-height, 88px)" }}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            data-lenis-prevent
          >
            <div className="shrink-0 border-b border-[#e8e8e8] px-4 py-3">
              <div className="flex items-center gap-2.5">
                <HoverIcon
                  name="search"
                  size={32}
                  alt=""
                  className="shrink-0 opacity-70"
                />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="搜尋商品..."
                  className="min-w-0 flex-1 bg-transparent text-[14px] tracking-[0.04em] text-black outline-none placeholder:text-[#999]"
                  autoComplete="off"
                  enterKeyHint="search"
                />
                {query && (
                  <button
                    type="button"
                    aria-label="清除搜尋"
                    className="shrink-0 px-1 text-[18px] leading-none text-[#888]"
                    onClick={() => setQuery("")}
                  >
                    ×
                  </button>
                )}
              </div>

              {showResults && (
                <div className="mt-2 max-h-[36vh] overflow-y-auto border-t border-[#f0f0f0] pt-2">
                  {loading && (
                    <p className="py-4 text-center text-[12px] tracking-[0.06em] text-[#888]">
                      搜尋中...
                    </p>
                  )}

                  {!loading && results.length === 0 && (
                    <p className="py-4 text-center text-[12px] tracking-[0.06em] text-[#888]">
                      找不到相關商品
                    </p>
                  )}

                  {!loading && results.length > 0 && (
                    <ul className="space-y-0.5">
                      {results.map((item) => (
                        <li key={`${item.id}-${item.slug}`}>
                          <Link
                            href={`/products/${item.slug}`}
                            onClick={onClose}
                            className="flex items-center gap-3 rounded-sm px-1 py-2.5 transition-colors hover:bg-[#f5f5f5]"
                          >
                            <div className="relative h-14 w-11 shrink-0 overflow-hidden bg-[#f0f0f0]">
                              {item.image ? (
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  fill
                                  className="object-cover"
                                  sizes="44px"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[9px] text-[#bbb]">
                                  NO IMG
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[13px] tracking-[0.04em] text-black">
                                {item.name}
                              </p>
                              <p className="mt-0.5 text-[12px] tracking-[0.04em] text-[#555]">
                                {formatSearchPrice(item.price)}
                              </p>
                            </div>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              <Link href="/products" className={linkClass} onClick={onClose}>
                ALL ITEMS
              </Link>
              {categories.map((category) => (
                <Link
                  key={category.id}
                  href={category.href}
                  className={linkClass}
                  onClick={onClose}
                >
                  {category.label}
                </Link>
              ))}

              <button
                type="button"
                className={`${linkClass} flex w-full items-center gap-3 text-left`}
                onClick={handleFavorites}
              >
                <WishlistIcon size={36} />
                <span className="text-[14px] tracking-[0.12em]">收藏清單</span>
              </button>

              <button
                type="button"
                className={`${linkClass} flex w-full items-center gap-3 text-left`}
                onClick={handleAccount}
              >
                <HoverIcon name="member" size={36} alt="" />
                <span className="text-[14px] tracking-[0.12em]">
                  {loggedIn ? "會員中心" : "會員登入"}
                </span>
              </button>
            </div>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
}
