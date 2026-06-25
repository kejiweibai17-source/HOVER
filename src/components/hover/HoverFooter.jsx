"use client";

import { useState } from "react";
import { Link } from "next-view-transitions";
import HoverLogo from "@/components/hover/HoverLogo";
import HoverIcon from "@/components/hover/HoverIcon";

const FOOTER_COLS = [
  {
    title: "關於我們",
    links: [
      { label: "品牌故事", href: "/brand" },
      {
        label: "最新消息",
        href: "https://www.instagram.com/hover.tw?igsh=ODFwaXZmam5kOXJn",
      },
    ],
  },
  {
    title: "顧客服務",
    links: [
      { label: "會員制度", href: "/membership" },
      { label: "如何購買", href: "/how-to-buy" },
      { label: "申請退貨", href: "/returns" },
      { label: "常見問題", href: "/faq" },
    ],
  },
  {
    title: "政策條款",
    links: [
      { label: "服務條款", href: "/terms" },
      { label: "隱私權保護", href: "/privacy" },
    ],
  },
];

const SOCIAL_LINKS = [
  { label: "LINE", href: "https://line.me/R/ti/p/@330kefmm", icon: "line" },
  {
    label: "Instagram",
    href: "https://www.instagram.com/hover.tw?igsh=ODFwaXZmam5kOXJn",
    icon: "ig",
  },
  {
    label: "Facebook",
    href: "https://www.facebook.com/share/1EhyidjLHK/?mibextid=wwXIfr",
    icon: "fb",
  },
  { label: "YouTube", href: "#", icon: "yt" },
];

function FooterAccordion({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-white/25">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="text-[15px] tracking-[0.12em]">{title}</span>
        <span className="text-[20px] font-light leading-none">
          {open ? "−" : "+"}
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-[480px] pb-4 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
function FooterLink({ href, children }) {
  const external = href.startsWith("http");
  const className =
    "text-[14px] tracking-[0.06em] text-white/90 transition-opacity hover:opacity-60";

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div className="min-w-0">
      <h3 className="mb-4 text-[17px] font-normal tracking-[0.1em] md:mb-5">
        {title}
      </h3>
      <ul className="space-y-2.5 md:space-y-3">
        {links.map((l) => (
          <li key={l.label}>
            <FooterLink href={l.href}>{l.label}</FooterLink>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContactColumn() {
  return (
    <div className="min-w-0">
      <h3 className="mb-4 text-[17px] font-normal tracking-[0.1em] md:mb-5">
        聯絡我們
      </h3>
      <ul className="space-y-2.5 text-[13px] tracking-[0.04em] text-white/90 md:space-y-3">
        <li>
          <a
            href="mailto:service@hoverofficial.com"
            className="block transition-opacity hover:opacity-60"
          >
            SERVICE@HOVEROFFICIAL.COM
          </a>
        </li>
        <li>MON.-FRI. 10:00-19:00</li>
        <li>
          <a
            href="https://line.me/R/ti/p/@330kefmm"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-60"
          >
            LINE ID: @HOVER
          </a>
        </li>
      </ul>

      <div className="mt-5 flex items-center gap-3 md:mt-6">
        {SOCIAL_LINKS.map((s) => (
          <a
            key={s.label}
            href={s.href}
            target={s.href.startsWith("http") ? "_blank" : undefined}
            rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
            aria-label={s.label}
            className="inline-flex shrink-0 transition-opacity hover:opacity-70"
          >
            <HoverIcon name={s.icon} size={32} alt={s.label} />
          </a>
        ))}
      </div>
    </div>
  );
}

export default function HoverFooter() {
  return (
    <footer className="bg-[#2a514d] text-white">
      <div className="mx-auto w-full max-w-[1680px] px-6 py-12 md:px-12 md:py-16 lg:px-16 lg:py-[72px] xl:px-12">
        {/* 桌機 — 圖二：Logo | 分隔線 | 四欄均分 */}
        <div className="hidden lg:flex lg:items-start">
          {/* Logo + 分隔線 */}
          <div className="flex w-[26%] max-w-[300px] shrink-0 items-stretch gap-8 xl:gap-10">
            <Link
              href="/"
              className="block min-w-0 flex-1 text-white"
              aria-label="HOVER"
            >
              <HoverLogo
                className="h-auto w-full max-h-[100px] xl:max-h-[120px]"
                aria-hidden
              />
            </Link>
            <div className="w-px shrink-0 bg-white/40" aria-hidden />
          </div>

          {/* 四欄 */}
          <div className="min-w-0 flex-1 pl-8 xl:pl-10">
            <div className="grid grid-cols-4 gap-x-6 xl:gap-x-10 2xl:gap-x-14">
              {FOOTER_COLS.map((col) => (
                <FooterColumn
                  key={col.title}
                  title={col.title}
                  links={col.links}
                />
              ))}
              <ContactColumn />
            </div>
          </div>
        </div>

        {/* 手機 — 手風琴選單 */}
        <div className="lg:hidden">
          {FOOTER_COLS.map((col) => (
            <FooterAccordion key={col.title} title={col.title}>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <FooterLink href={l.href}>{l.label}</FooterLink>
                  </li>
                ))}
              </ul>
            </FooterAccordion>
          ))}

          <FooterAccordion title="追蹤我們">
            <div className="flex items-center gap-3 pt-1">
              {SOCIAL_LINKS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target={s.href.startsWith("http") ? "_blank" : undefined}
                  rel={s.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  aria-label={s.label}
                  className="inline-flex shrink-0 transition-opacity hover:opacity-70"
                >
                  <HoverIcon name={s.icon} size={36} alt={s.label} />
                </a>
              ))}
            </div>
          </FooterAccordion>

          <FooterAccordion title="聯絡我們">
            <ul className="space-y-2.5 text-[13px] tracking-[0.04em] text-white/90">
              <li>
                <a
                  href="mailto:service@hoverofficial.com"
                  className="block transition-opacity hover:opacity-60"
                >
                  SERVICE@HOVEROFFICIAL.COM
                </a>
              </li>
              <li>MON.-FRI. 10:00-19:00</li>
              <li>
                <a
                  href="https://line.me/R/ti/p/@330kefmm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-opacity hover:opacity-60"
                >
                  LINE ID: @HOVER
                </a>
              </li>
            </ul>
          </FooterAccordion>

          <div className="mt-10 flex justify-center">
            <Link href="/" className="text-white" aria-label="HOVER">
              <HoverLogo className="h-14 w-auto max-w-[200px] md:h-16" aria-hidden />
            </Link>
          </div>
        </div>

        {/* 底部版權 — 全置中 */}
        <div className="mt-12 border-t border-white/20 pt-8 text-center text-[12px] leading-relaxed tracking-[0.04em] text-white/70 md:mt-14 md:text-[13px]">
          <p>
            © 2026 HOVER. All Rights Reserved.{" "}
            停機坪國際文創股份有限公司 | 90230279
          </p>
        </div>
      </div>
    </footer>
  );
}
