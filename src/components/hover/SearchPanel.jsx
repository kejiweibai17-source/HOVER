"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useSearchStore, selectSearchOpen } from "@/lib/searchStore";
import { formatSearchPrice } from "@/lib/searchProducts";
import { useProductSearch } from "@/lib/useProductSearch";

function SearchResults({
  query,
  loading,
  results,
  onResultClick,
  compact = false,
}) {
  const trimmed = query.trim();

  if (!trimmed) {
    return (
      <p className="py-6 text-center text-[13px] tracking-[0.06em] text-[#888]">
        輸入關鍵字，即時搜尋商品
      </p>
    );
  }

  if (loading) {
    return (
      <p className="py-6 text-center text-[13px] tracking-[0.06em] text-[#888]">
        搜尋中...
      </p>
    );
  }

  if (results.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] tracking-[0.06em] text-[#888]">
        找不到相關商品
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {results.map((item) => (
        <li key={`${item.id}-${item.slug}`}>
          <Link
            href={`/products/${item.slug}`}
            onClick={onResultClick}
            className="flex items-center gap-3 rounded-sm px-1 py-2.5 transition-colors hover:bg-[#f5f5f5] md:gap-4 md:px-2 md:py-3"
          >
            <div
              className={`relative shrink-0 overflow-hidden bg-[#f0f0f0] aspect-[3/4] ${
                compact ? "w-11" : "w-14"
              }`}
            >
              {item.image ? (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes={compact ? "44px" : "56px"}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[9px] text-[#bbb] md:text-[10px]">
                  NO IMG
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] tracking-[0.04em] text-black md:text-[15px]">
                {item.name}
              </p>
              <p className="mt-0.5 text-[12px] tracking-[0.04em] text-[#555] md:mt-1 md:text-[13px]">
                {formatSearchPrice(item.price)}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DesktopSearchPanel({ open }) {
  const closeSearch = useSearchStore((s) => s.closeSearch);
  const inputRef = useRef(null);
  const { query, setQuery, results, loading, reset } = useProductSearch(open, 10);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }

    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [open, reset]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") closeSearch();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, closeSearch]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="關閉搜尋"
            className="fixed inset-x-0 bottom-0 z-[1200] hidden bg-black/10 md:block"
            style={{ top: "var(--hover-header-height, 88px)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSearch}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="商品搜尋"
            className="fixed inset-x-0 z-[1210] hidden flex-col overflow-hidden bg-white md:flex"
            style={{
              top: "var(--hover-header-height, 88px)",
              maxHeight: "calc(100dvh - var(--hover-header-height, 88px))",
            }}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            <div className="flex shrink-0 justify-center px-6 py-5">
              <div className="flex w-full max-w-[520px] items-center border border-[#d4d4d4] px-4 py-3">
                <input
                  ref={inputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="search"
                  className="min-w-0 flex-1 bg-transparent font-serif text-[15px] tracking-[0.04em] text-black outline-none placeholder:text-[#b8b8b8]"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={closeSearch}
                  aria-label="關閉"
                  className="shrink-0 pl-3 text-[#999] transition-opacity hover:opacity-60"
                >
                  <X size={18} strokeWidth={1.25} />
                </button>
              </div>
            </div>

            <div
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#fafafa] px-6 pb-6"
              data-lenis-prevent
            >
              <div className="mx-auto max-w-[520px]">
                <SearchResults
                  query={query}
                  loading={loading}
                  results={results}
                  onResultClick={closeSearch}
                />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function MobileSearchBar({ open, inputRef }) {
  const closeSearch = useSearchStore((s) => s.closeSearch);
  const { query, setQuery, results, loading, reset } = useProductSearch(open, 12);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }

    const timer = window.setTimeout(() => inputRef?.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [open, reset, inputRef]);

  useEffect(() => {
    if (!open) return undefined;

    const mq = window.matchMedia("(max-width: 767px)");
    const lockScroll = () => {
      if (mq.matches) document.body.style.overflow = "hidden";
    };
    const unlockScroll = () => {
      document.body.style.overflow = "";
    };

    lockScroll();
    mq.addEventListener("change", lockScroll);

    return () => {
      mq.removeEventListener("change", lockScroll);
      unlockScroll();
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="shrink-0 border-t border-[#ececec] bg-white px-4 py-3 md:hidden">
        <div className="flex items-center border border-[#d4d4d4] px-4 py-3">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search"
            className="min-w-0 flex-1 bg-transparent font-serif text-[15px] tracking-[0.04em] text-black outline-none placeholder:text-[#b8b8b8]"
            autoComplete="off"
            enterKeyHint="search"
          />
          {query && (
            <button
              type="button"
              aria-label="清除搜尋"
              onClick={() => setQuery("")}
              className="shrink-0 pl-3 text-[#999] transition-opacity hover:opacity-60"
            >
              <X size={18} strokeWidth={1.25} />
            </button>
          )}
        </div>
      </div>

      <div
        className="fixed inset-x-0 bottom-0 z-[1200] flex flex-col overflow-hidden bg-white md:hidden"
        style={{ top: "var(--hover-header-height, 88px)" }}
      >
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3"
          data-lenis-prevent
        >
          <SearchResults
            query={query}
            loading={loading}
            results={results}
            onResultClick={closeSearch}
            compact
          />
        </div>
      </div>
    </>
  );
}

export default function SearchPanel() {
  const open = useSearchStore(selectSearchOpen);
  return <DesktopSearchPanel open={open} />;
}
