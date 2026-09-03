"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { HOVER_LINE_OA } from "@/lib/orderActions";

function ReturnLineRedirect() {
  const searchParams = useSearchParams();
  const isContact = searchParams.get("m") === "contact";
  const lineUrl = HOVER_LINE_OA;

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
