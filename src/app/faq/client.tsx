"use client";

import { useState } from "react";
import { FAQ_SECTIONS, type FAQSection } from "./faq-data";

function AccordionItem({
  section,
  open,
  onToggle,
}: {
  section: FAQSection;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-[#d8d8d8]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-5 text-left md:py-6"
      >
        <span className="flex items-baseline gap-3 md:gap-4">
          <span className="text-[13px] font-light tracking-[0.08em] text-[#999] md:text-[14px]">
            {section.num}
          </span>
          <span className="text-[15px] font-bold tracking-[0.06em] text-gray-700 md:text-[16px]">
            {section.title}
          </span>
        </span>
        <span
          className="shrink-0 text-[22px] font-light leading-none text-black transition-transform duration-300"
          aria-hidden
        >
          {open ? "−" : "+"}
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-[4000px] pb-6 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-[#ececec] py-4 md:py-5">
          <div className="space-y-5 px-4 md:px-5">
            {section.items.map((item) => (
              <div key={item.question}>
                <p className="text-[13px] font-bold leading-relaxed tracking-[0.04em] text-black md:text-[14px]">
                  Q. {item.question}
                </p>
                <p className="mt-2 text-[12px] leading-[2] tracking-[0.04em] text-[#555] md:text-[13px]">
                  A. {item.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FAQClient() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="relative bg-white pb-24">
      <header className="px-4 pb-8 pt-14 text-center md:pb-10 md:pt-20">
        <h1 className="font-serif text-[28px] font-medium tracking-[0.12em] text-[#2a514d] md:text-[32px]">
          常見問題
        </h1>
      </header>

      <div className="mx-auto max-w-[760px] border-t border-[#d8d8d8] px-4 md:px-6">
        {FAQ_SECTIONS.map((section, i) => (
          <AccordionItem
            key={section.num}
            section={section}
            open={openIndex === i}
            onToggle={() => setOpenIndex(openIndex === i ? null : i)}
          />
        ))}
      </div>
    </div>
  );
}
