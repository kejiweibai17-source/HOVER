"use client";

import { Suspense } from "react";
import Image from "next/image";
import HoverIcon from "@/components/hover/HoverIcon";
import { useSearchParams } from "next/navigation";

function ThankYouContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId") || "";

  return (
    <div className="bg-hover-bg">
      <div className="flex flex-col items-center px-6 pb-10 pt-16 text-center md:pt-20">
        <HoverIcon name="orderComplete" size={140} alt="" />
        <h1 className="mt-10 text-[22px] font-bold text-black md:text-[24px]">
          感謝您的購買
        </h1>
        {orderId && (
          <p className="mt-5 text-[14px] tracking-[0.04em] text-[#888]">
            訂單編號 {orderId}
          </p>
        )}
      </div>

      <div className="border-t border-[#ddd]" />

      <div className="relative mx-auto aspect-[16/7] w-full max-w-[1400px] bg-[#e8e6e2] md:aspect-[16/6]">
        <Image
          src="/images/hover/pdp-main-1.jpg"
          alt="HOVER"
          fill
          className="object-cover"
          sizes="100vw"
          priority
        />
      </div>
    </div>
  );
}

export default function ThankYouClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[55vh] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#dfe0e5] border-t-[#2a514d]" />
        </div>
      }
    >
      <ThankYouContent />
    </Suspense>
  );
}
