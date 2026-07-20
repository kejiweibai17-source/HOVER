"use client";

import { useEffect, useState } from "react";
import { Link } from "next-view-transitions";

const STORAGE_KEY = "hover_cookie_consent_v1";

type ConsentRecord = {
  accepted: true;
  at: string;
};

function readConsent(): ConsentRecord | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    return parsed?.accepted === true ? parsed : null;
  } catch {
    return null;
  }
}

function writeConsent(): void {
  const record: ConsentRecord = {
    accepted: true,
    at: new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  } catch {
    // ignore quota / private mode
  }
}

/**
 * 基本 Cookie 提示（合約免費範圍）：
 * - 進站顯示提示，可連至隱私權政策
 * - 同意後寫入 localStorage，之後不再重複顯示
 * - 不攔截 GA4 / Meta Pixel 等追蹤碼
 */
export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!readConsent()) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    writeConsent();
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie 使用提示"
      className="fixed inset-x-0 bottom-0 z-[940] px-4 pb-4 pt-2 md:px-6 md:pb-6"
    >
      <div className="mx-auto flex max-w-[920px] flex-col gap-4 border border-black/10 bg-white px-5 py-4 shadow-[0_-4px_32px_rgba(0,0,0,0.12)] md:flex-row md:items-center md:gap-6 md:px-6 md:py-5">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold tracking-[0.06em] text-[#2a514d] md:text-[14px]">
            Cookie 使用提示
          </p>
          <p className="mt-1.5 text-[12px] leading-[1.75] tracking-[0.02em] text-[#374151] md:text-[13px]">
            本網站使用 Cookie
            以維持會員登入、購物車及網站功能，並作為服務優化之用。繼續瀏覽即表示您了解相關說明，詳情請參閱
            <Link
              href="/privacy"
              className="mx-1 font-semibold text-[#2a514d] underline underline-offset-2 transition-opacity hover:opacity-70"
            >
              隱私權保護政策
            </Link>
            。
          </p>
        </div>
        <button
          type="button"
          onClick={handleAccept}
          className="shrink-0 bg-[#2a514d] px-6 py-2.5 text-[12px] font-semibold tracking-[0.12em] text-white transition-colors hover:bg-[#1e3d3a] md:text-[13px]"
        >
          我同意
        </button>
      </div>
    </div>
  );
}
