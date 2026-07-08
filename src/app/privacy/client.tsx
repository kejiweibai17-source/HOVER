"use client";

import { useState } from "react";
import {
  PRIVACY_INTRO,
  PRIVACY_SECTIONS,
  type PrivacySection,
  type PrivacySubSection,
} from "./privacy-data";

function SubAccordionPanel({
  subSections,
}: {
  subSections: PrivacySubSection[];
}) {
  const [openSubs, setOpenSubs] = useState<Set<number>>(
    () => new Set(subSections.map((_, i) => i)),
  );

  const toggleSub = (index: number) => {
    setOpenSubs((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <div className="overflow-hidden">
      {subSections.map((sub, i) => {
        const open = openSubs.has(i);
        return (
          <div key={sub.title} className="border-b border-[#ddd] last:border-b-0">
            <button
              type="button"
              onClick={() => toggleSub(i)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 py-3.5 text-left md:py-4"
            >
              <span className="text-[13px] font-bold tracking-[0.04em] text-black md:text-[14px]">
                {sub.title}
              </span>
              <span
                className="shrink-0 text-[20px] font-light leading-none text-black"
                aria-hidden
              >
                {open ? "−" : "+"}
              </span>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${
                open ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="space-y-3 pb-4 pt-1 text-[12px] leading-[2] tracking-[0.04em] text-[#555] md:pb-5 md:text-[13px]">
                {sub.paragraphs.map((p, idx) => (
                  <p key={`${sub.title}-p-${idx}`}>{p}</p>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AccordionItem({
  section,
  open,
  onToggle,
}: {
  section: PrivacySection;
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
          <span className="text-[15px] font-medium tracking-[0.06em] text-[#2a514d] md:text-[16px]">
            {section.title}
          </span>
        </span>
        <span
          className="shrink-0 text-[22px] font-light leading-none text-[#2a514d] transition-transform duration-300"
          aria-hidden
        >
          {open ? "−" : "+"}
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-[3000px] pb-6 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="space-y-3 bg-[#f5f5f5] px-5 py-5 md:px-6 md:py-6">
          {section.paragraphs.slice(0, section.list ? 1 : undefined).map((p, idx) => (
            <p
              key={`${section.num}-p-${idx}`}
              className="text-[12px] leading-[2] tracking-[0.04em] text-[#555] md:text-[13px]"
            >
              {p}
            </p>
          ))}
          {section.subSections && (
            <SubAccordionPanel subSections={section.subSections} />
          )}
          {section.list && (
            <ul className="list-none space-y-2 pl-0">
              {section.list.map((item) => (
                <li
                  key={item}
                  className="flex gap-2 text-[12px] leading-[2] tracking-[0.04em] text-[#555] md:text-[13px]"
                >
                  <span className="shrink-0 text-[#2a514d]">・</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          {(section.list ? section.paragraphs.slice(1) : section.paragraphs).map(
            (p, idx) => (
              <p
                key={`${section.num}-p-rest-${idx}`}
                className="text-[12px] leading-[2] tracking-[0.04em] text-[#555] md:text-[13px]"
              >
                {p}
              </p>
            ),
          )}
        </div>
      </div>
    </div>
  );
}

export default function PrivacyClient() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="relative bg-white pb-24">
      <header className="px-4 pb-8 pt-14 text-center md:pb-10 md:pt-20">
        <h1 className="font-serif text-[28px] font-medium tracking-[0.12em] text-[#2a514d] md:text-[32px]">
          隱私權保護
        </h1>
        <div className="mx-auto mt-6 max-w-[640px] space-y-3 text-center md:mt-8">
          {PRIVACY_INTRO.map((p, idx) => (
            <p
              key={p}
              className={`text-[12px] leading-[2] tracking-[0.04em] text-[#555] md:text-[13px] ${
                idx === 1 ? "font-medium text-[#333]" : ""
              }`}
            >
              {p}
            </p>
          ))}
        </div>
      </header>

      <div className="mx-auto max-w-[760px] border-t border-[#d8d8d8] px-4 md:px-6">
        {PRIVACY_SECTIONS.map((section, i) => (
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
