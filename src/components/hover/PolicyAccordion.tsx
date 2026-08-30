"use client";

import { useMemo, useState } from "react";

import { sanitizeRichHtml } from "@/lib/utils";

export type PolicyInnerItem = {
  title: string;
  titleColor?: string;
  /** 是否可收折；false 則標題與內容直接展開顯示 */
  collapsible: boolean;
  contentHtml: string;
};

export type PolicySection = {
  num: string;
  title: string;
  titleColor?: string;
  items: PolicyInnerItem[];
};

const richClass = [
  "policy-rich-content text-[12px] leading-[2] tracking-[0.04em] md:text-[13px]",
  "[&_p]:mb-3 [&_p]:text-inherit [&_p:last-child]:mb-0",
  "[&_li]:text-inherit [&_a]:text-inherit",
  // 後台連續 Enter 的空白段：保留高度當作空行
  "[&_p:has(>br:only-child)]:mb-0 [&_p:has(>br:only-child)]:min-h-[1.6em]",
  "[&_a]:underline [&_a]:underline-offset-2",
  "[&_strong]:font-bold [&_em]:italic",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:my-1",
  "[&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-[15px] [&_h1]:font-bold",
  "[&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-[14px] [&_h2]:font-bold",
  "[&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-[13px] [&_h3]:font-bold",
  "[&_*:last-child]:mb-0",
].join(" ");

function hasHtmlText(html?: string): boolean {
  return Boolean(html && html.replace(/<[^>]+>/g, "").trim());
}

function RichHtml({
  html,
  contentColor,
}: {
  html: string;
  contentColor: string;
}) {
  const safeHtml = useMemo(() => sanitizeRichHtml(html), [html]);
  if (!hasHtmlText(safeHtml)) return null;
  return (
    <div
      className={richClass}
      style={{ color: contentColor }}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}

function InnerItemBlock({
  item,
  contentColor,
  defaultOpen,
}: {
  item: PolicyInnerItem;
  contentColor: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const hasTitle = Boolean(item.title?.trim());
  const hasContent = hasHtmlText(item.contentHtml);
  const titleColor = item.titleColor || "#0f172a";

  if (!hasTitle && !hasContent) return null;

  // 不收折：直接顯示標題 + 內容
  if (!item.collapsible) {
    return (
      <div className="border-b border-[#ffffff] px-4 py-3.5 last:border-b-0 md:px-5 md:py-4">
        {hasTitle ? (
          <p
            className="mb-2 text-[13px] font-bold tracking-[0.04em] md:text-[14px]"
            style={{ color: titleColor }}
          >
            {item.title.trim()}
          </p>
        ) : null}
        <RichHtml html={item.contentHtml || ""} contentColor={contentColor} />
      </div>
    );
  }

  // 可收折：內層 accordion
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mb-0 flex w-full items-center justify-between gap-4 border-b border-[#ffffff] px-4 py-3.5 text-left md:px-5 md:py-4"
      >
        <span
          className="text-[13px] font-bold tracking-[0.04em] md:text-[14px]"
          style={{ color: titleColor }}
        >
          {hasTitle ? item.title.trim() : "內容"}
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
          open ? "max-h-[4000px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="px-4 pb-4 pt-1 md:px-5 md:pb-5">
          <RichHtml html={item.contentHtml || ""} contentColor={contentColor} />
        </div>
      </div>
    </div>
  );
}

function PolicyAccordionItem({
  section,
  open,
  onToggle,
  contentColor,
}: {
  section: PolicySection;
  open: boolean;
  onToggle: () => void;
  contentColor: string;
}) {
  const items = section.items || [];
  const showBody = items.some(
    (item) => item.title?.trim() || hasHtmlText(item.contentHtml),
  );
  const titleColor = section.titleColor || "#4b5563";

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
          <span
            className="text-[15px] font-bold tracking-[0.06em] md:text-[16px]"
            style={{ color: titleColor }}
          >
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
          open ? "max-h-[6000px] pb-6 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {showBody && (
          <div className="overflow-hidden rounded-sm bg-[#ececec] py-4 md:py-5">
            <div>
              {items.map((item, i) => (
                <InnerItemBlock
                  key={`${item.title}-${i}`}
                  item={item}
                  contentColor={contentColor}
                  defaultOpen
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PolicyAccordion({
  sections,
  contentColor = "#2a514d",
}: {
  sections: PolicySection[];
  contentColor?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      {sections.map((section, i) => (
        <PolicyAccordionItem
          key={`${section.num}-${section.title}-${i}`}
          section={section}
          open={openIndex === i}
          onToggle={() => setOpenIndex(openIndex === i ? null : i)}
          contentColor={contentColor}
        />
      ))}
    </>
  );
}
