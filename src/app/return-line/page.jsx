"use client";

import { Suspense, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  HOVER_LINE_OA,
  HOVER_LINE_OA_ID,
  buildOrderLineMessageFromParams,
} from "@/lib/orderActions";

function ReturnLineRedirect() {
  const searchParams = useSearchParams();

  const lineUrl = useMemo(() => {
    const params = {
      m: searchParams.get("m"),
      n: searchParams.get("n"),
      d: searchParams.get("d"),
      t: searchParams.get("t"),
      p: searchParams.get("p"),
      s: searchParams.get("s"),
      i: searchParams.get("i"),
    };
    const text = buildOrderLineMessageFromParams(params);
    if (!params.n && !params.i) {
      return HOVER_LINE_OA;
    }
    return `https://line.me/R/oaMessage/${HOVER_LINE_OA_ID}/?text=${encodeURIComponent(text)}`;
  }, [searchParams]);

  const isContact = searchParams.get("m") === "contact";

  useEffect(() => {
    window.location.replace(lineUrl);
  }, [lineUrl]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-[15px] text-[#333]">
        {isContact ? "正在開啟 LINE 聯繫客服…" : "正在開啟 LINE 申請退貨…"}
      </p>
      <a
        href={lineUrl}
        className="bg-[#2a514d] px-5 py-2.5 text-[13px] text-white"
      >
        若未自動跳轉，請點此開啟
      </a>
    </div>
  );
}

export default function ReturnLinePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center text-[14px] text-[#888]">
          載入中…
        </div>
      }
    >
      <ReturnLineRedirect />
    </Suspense>
  );
}
