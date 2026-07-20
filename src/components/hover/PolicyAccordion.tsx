"use client";

import { useState } from "react";

export type PolicySubSection = {
  title: string;
  paragraphs: string[];
  list?: string[];
  links?: { label: string; href: string }[];
};

export type PolicySection = {
  num: string;
  title: string;
  paragraphs?: string[];
  list?: string[];
  subSections?: PolicySubSection[];
};

function SubAccordionPanel({
  subSections,
}: {
  subSections: PolicySubSection[];
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
    <div className="overflow-hidden rounded-sm bg-[#ececec]">
      {subSections.map((sub, i) => {
        const open = openSubs.has(i);
        return (
          <div key={sub.title}>
            <button
              type="button"
              onClick={() => toggleSub(i)}
              aria-expanded={open}
              className="flex w-full items-center justify-between gap-4 border-b border-[#ffffff] mb-4  px-4 py-3.5 text-left md:px-5 md:py-4"
            >
              <span className="text-[13px] font-bold tracking-[0.04em] text-[#0F172A] md:text-[14px]">
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
              className={`overflow-hidden bg-[#ececec] transition-all duration-300 ${
                open ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"
              }`}
            >
              <div className="space-y-3 px-4 pb-4 pt-1 text-[12px] leading-[2] tracking-[0.04em] text-[#374151] md:px-5 md:pb-5 md:text-[13px]">
                {sub.paragraphs.map((p, idx) => (
                  <p key={`${sub.title}-p-${idx}`}>{p}</p>
                ))}
                {sub.list && (
                  <ul className="list-none space-y-2 pl-0">
                    {sub.list.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span className="shrink-0 text-[#374151]">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {sub.links && (
                  <ul className="list-none space-y-2 pl-0">
                    {sub.links.map((link) => (
                      <li key={link.href} className="flex gap-2">
                        <span className="shrink-0 text-[#374151]">・</span>
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#374151] underline underline-offset-2 transition-opacity hover:opacity-70"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PolicyAccordionItem({
  section,
  open,
  onToggle,
}: {
  section: PolicySection;
  open: boolean;
  onToggle: () => void;
}) {
  const hasBody =
    (section.paragraphs && section.paragraphs.length > 0) ||
    (section.list && section.list.length > 0) ||
    (section.subSections && section.subSections.length > 0);

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
        {hasBody && (
          <div className="bg-[#ececec]  py-4  md:py-5">
            {section.subSections ? (
              <>
                {section.paragraphs && section.paragraphs.length > 0 && (
                  <div className="mb-4 space-y-3 px-4 text-[12px] leading-[2] tracking-[0.04em] text-[#374151] md:mb-5 md:px-5 md:text-[13px]">
                    {section.paragraphs.map((p, idx) => (
                      <p key={`${section.num}-intro-${idx}`}>{p}</p>
                    ))}
                  </div>
                )}
                <SubAccordionPanel subSections={section.subSections} />
              </>
            ) : (
              <div className="space-y-3 px-4 text-[12px] leading-[2] tracking-[0.04em] text-[#374151] md:px-5 md:text-[13px]">
                {section.list ? (
                  <>
                    {section.paragraphs?.[0] && <p>{section.paragraphs[0]}</p>}
                    <ul className="list-none space-y-2 pl-0">
                      {section.list.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span className="shrink-0 text-[#374151]">・</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    {section.paragraphs?.slice(1).map((p, idx) => (
                      <p key={`${section.num}-after-${idx}`}>{p}</p>
                    ))}
                  </>
                ) : (
                  section.paragraphs?.map((p, idx) => (
                    <p key={`${section.num}-p-${idx}`}>{p}</p>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PolicyAccordion({
  sections,
}: {
  sections: PolicySection[];
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      {sections.map((section, i) => (
        <PolicyAccordionItem
          key={section.num}
          section={section}
          open={openIndex === i}
          onToggle={() => setOpenIndex(openIndex === i ? null : i)}
        />
      ))}
    </>
  );
}
