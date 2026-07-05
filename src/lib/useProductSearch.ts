"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 280;

export function useProductSearch(active: boolean, limit = 10) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<
    Array<{
      id: number | string;
      slug: string;
      name: string;
      price: string;
      image?: string;
    }>
  >([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const runSearch = useCallback(
    async (value: string) => {
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
          `/api/search?q=${encodeURIComponent(q)}&limit=${limit}`,
          { signal: controller.signal },
        );
        const data = await res.json();
        if (!controller.signal.aborted) {
          setResults(Array.isArray(data?.results) ? data.results : []);
        }
      } catch (err) {
        if (
          err instanceof Error &&
          err.name !== "AbortError" &&
          !controller.signal.aborted
        ) {
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [limit],
  );

  useEffect(() => {
    if (!active) {
      setQuery("");
      setResults([]);
      setLoading(false);
      abortRef.current?.abort();
      return;
    }

    const timer = window.setTimeout(() => runSearch(query), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query, active, runSearch]);

  const reset = useCallback(() => {
    setQuery("");
    setResults([]);
    setLoading(false);
    abortRef.current?.abort();
  }, []);

  return { query, setQuery, results, loading, reset };
}
