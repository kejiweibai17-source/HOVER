"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { AFFILIATE_REF_PARAM, normalizeRefCode } from "@/lib/affiliate";

const SESSION_KEY = "hover_ref_clicked";

/** 專屬連結點擊數：同一分頁工作階段、同一代碼只記一次 */
export default function AffiliateTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const code = normalizeRefCode(
      new URLSearchParams(window.location.search).get(AFFILIATE_REF_PARAM),
    );
    if (!code) return;
    try {
      const seen: string[] = JSON.parse(sessionStorage.getItem(SESSION_KEY) || "[]");
      if (seen.includes(code)) return;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify([...seen, code]));
    } catch {
      /* ignore */
    }
    fetch("/api/affiliate/click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
      keepalive: true,
    }).catch(() => {});
  }, [pathname]);

  return null;
}
