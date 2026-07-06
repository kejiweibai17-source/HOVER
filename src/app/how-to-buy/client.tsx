"use client";

import PolicyAccordion from "@/components/hover/PolicyAccordion";
import { HOW_TO_BUY_SECTIONS } from "./how-to-buy-data";

export default function HowToBuyClient() {
  return (
    <div className="relative bg-white pb-24">
      <header className="px-4 pb-10 pt-14 text-center md:pb-14 md:pt-20">
        <h1 className="font-serif text-[28px] font-medium tracking-[0.12em] text-[#2a514d] md:text-[32px]">
          如何購買
        </h1>
      </header>

      <div className="mx-auto max-w-[760px] border-t border-[#d8d8d8] px-4 md:px-6">
        <PolicyAccordion sections={HOW_TO_BUY_SECTIONS} />
      </div>
    </div>
  );
}
