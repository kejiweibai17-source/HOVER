"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import HoverIcon from "@/components/hover/HoverIcon";
import { useSearchStore, selectSearchOpen } from "@/lib/searchStore";
import { formatSearchPrice } from "@/lib/searchProducts";

const DEBOUNCE_MS = 280;

export default function SearchPanel() {
  const open = useSearchStore(selectSearchOpen);
  const closeSearch = useSearchStore((s) => s.closeSearch);
  const inputRef = useRef(null);
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
        `/api/search?q=${encodeURIComponent(q)}&limit=10`,
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

    const timer = window.setTimeout(() => inputRef.current?.focus(), 120);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => runSearch(query), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, open, runSearch]);

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

  const handleResultClick = () => {
    closeSearch();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="關閉搜尋"
            className="fixed inset-0 z-[1050] bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeSearch}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="商品搜尋"
            className="fixed bottom-0 right-0 top-[var(--hover-header-height,116px)] z-[1060] flex w-full max-w-[520px] flex-col border-l border-[#e8e8e8] bg-white shadow-[-8px_0_32px_rgba(0,0,0,0.08)]"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            {/* 搜尋列 */}
            <div className="flex items-center gap-3 border-b border-[#ececec] px-5 py-4 md:px-6 md:py-5">
              <HoverIcon name="search" size={28} alt="" className="shrink-0 opacity-70" />
              <input
                ref={inputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜尋商品..."
                className="min-w-0 flex-1 bg-transparent text-[15px] tracking-[0.04em] text-black outline-none placeholder:text-[#999] md:text-[16px]"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={closeSearch}
                aria-label="關閉"
                className="shrink-0 text-black transition-opacity hover:opacity-50"
              >
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>

            {/* 結果 */}
            <div className="flex-1 overflow-y-auto px-5 py-4 md:px-6 md:py-5">
              {!query.trim() && (
                <p className="py-8 text-center text-[13px] tracking-[0.06em] text-[#888]">
                  輸入關鍵字，即時搜尋商品
                </p>
              )}

              {query.trim() && loading && (
                <p className="py-8 text-center text-[13px] tracking-[0.06em] text-[#888]">
                  搜尋中...
                </p>
              )}

              {query.trim() && !loading && results.length === 0 && (
                <p className="py-8 text-center text-[13px] tracking-[0.06em] text-[#888]">
                  找不到相關商品
                </p>
              )}

              {!loading && results.length > 0 && (
                <ul className="space-y-1">
                  {results.map((item) => (
                    <li key={`${item.id}-${item.slug}`}>
                      <Link
                        href={`/products/${item.slug}`}
                        onClick={handleResultClick}
                        className="flex items-center gap-4 rounded-sm px-2 py-3 transition-colors hover:bg-[#f5f5f5]"
                      >
                        <div className="relative h-[72px] w-[56px] shrink-0 overflow-hidden bg-[#f0f0f0]">
                          {item.image ? (
                            <Image
                              src={item.image}
                              alt={item.name}
                              fill
                              className="object-cover"
                              sizes="56px"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] text-[#bbb]">
                              NO IMG
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] tracking-[0.04em] text-black md:text-[15px]">
                            {item.name}
                          </p>
                          <p className="mt-1 text-[13px] tracking-[0.04em] text-[#555]">
                            {formatSearchPrice(item.price)}
                          </p>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
