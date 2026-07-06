"use client";

import PolicyAccordion from "@/components/hover/PolicyAccordion";
import { RETURNS_SECTIONS } from "./returns-data";

export default function ReturnsClient() {
  return (
    <div className="relative bg-white pb-24">
      <header className="px-4 pb-8 pt-14 text-center md:pb-10 md:pt-20">
        <h1 className="font-serif text-[28px] font-medium tracking-[0.12em] text-[#2a514d] md:text-[32px]">
          申請退貨
        </h1>
        <p className="mx-auto mt-6 max-w-[560px] text-[12px] leading-[2] tracking-[0.04em] text-[#555] md:text-[13px]">
          HOVER 希望每一次購買都能讓您安心。若您收到商品後有退貨需求，請依照以下說明提出申請，我們將協助您完成退貨流程。
        </p>
      </header>

      <div className="mx-auto max-w-[760px] border-t border-[#d8d8d8] px-4 md:px-6">
        <PolicyAccordion sections={RETURNS_SECTIONS} />
      </div>
    </div>
  );
}
