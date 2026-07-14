"use client";

import PolicyAccordion, {
  type PolicySection,
} from "@/components/hover/PolicyAccordion";
import { FAQ_SECTIONS } from "./faq-data";

const FAQ_POLICY_SECTIONS: PolicySection[] = FAQ_SECTIONS.map((section) => ({
  num: section.num,
  title: section.title,
  subSections: section.items.map((item) => ({
    title: item.question,
    paragraphs: [item.answer],
  })),
}));

export default function FAQClient() {
  return (
    <div className="relative bg-white pb-24">
      <header className="px-4 pb-8 pt-14 text-center md:pb-10 md:pt-20">
        <h1 className="font-serif text-[28px] font-medium tracking-[0.12em] text-[#2a514d] md:text-[32px]">
          常見問題
        </h1>
      </header>

      <div className="mx-auto max-w-[760px] border-t border-[#d8d8d8] px-4 md:px-6">
        <PolicyAccordion sections={FAQ_POLICY_SECTIONS} />
      </div>
    </div>
  );
}
