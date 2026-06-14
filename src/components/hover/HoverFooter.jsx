"use client";

import { Link } from "next-view-transitions";
import HoverLogo from "@/components/hover/HoverLogo";

const FOOTER_COLS = [
  {
    title: "關於我們",
    links: [
      { label: "品牌故事", href: "/brand" },
      { label: "聯絡我們", href: "/contact" },
    ],
  },
  {
    title: "顧客服務",
    links: [
      { label: "會員中心", href: "/account" },
      { label: "如何購買", href: "/products" },
      { label: "購物袋", href: "/cart" },
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
  {
    label: "LINE",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
      </svg>
    ),
  },
  {
    label: "Instagram",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    label: "Facebook",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    label: "YouTube",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
];

export default function HoverFooter() {
  return (
    <footer className="bg-[#2a514d] text-white">
      <div className="mx-auto w-full max-w-[1400px] px-8 py-14 md:px-12 md:py-16 lg:px-16">
        {/* Main: logo | divider | 4 columns */}
        <div className="flex flex-col lg:flex-row lg:items-stretch">
          {/* Left — HOVER logo */}
          <div className="flex shrink-0 items-center lg:w-[300px] xl:w-[340px]">
            <Link href="/" className="block text-white" aria-label="HOVER">
              <HoverLogo className="h-20 w-auto md:h-24 xl:h-28" aria-hidden />
            </Link>
          </div>

          {/* Vertical divider */}
          <div
            className="my-8 h-px w-full bg-white/50 lg:my-0 lg:mx-10 lg:h-auto lg:w-px lg:shrink-0 xl:mx-14"
            aria-hidden
          />

          {/* Right — link columns */}
          <div className="grid flex-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6 xl:gap-10">
            {FOOTER_COLS.map((col) => (
              <div key={col.title}>
                <h3 className="mb-5 text-[17px] font-normal tracking-[0.15em] md:text-[18px]">
                  {col.title}
                </h3>
                <ul className="space-y-3">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        className="text-[14px] tracking-[0.12em] text-white/90 transition-opacity hover:opacity-60 md:text-[15px]"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {/* Contact column */}
            <div>
              <h3 className="mb-5 text-[17px] font-normal tracking-[0.15em] md:text-[18px]">
                聯絡我們
              </h3>
              <ul className="space-y-3 text-[13px] tracking-[0.08em] text-white/90 md:text-[14px]">
                <li>
                  <a
                    href="mailto:service@hoverofficial.com"
                    className="transition-opacity hover:opacity-60"
                  >
                    SERVICE@HOVEROFFICIAL.COM
                  </a>
                </li>
                <li>MON.-FRI. 10:00-19:00</li>
                <li>LINE ID: @HOVER</li>
              </ul>

              {/* Social icons */}
              <div className="mt-6 flex items-center gap-3">
                {SOCIAL_LINKS.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    aria-label={s.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-[#2a514d] transition-opacity hover:opacity-80"
                  >
                    {s.icon}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col gap-3 text-[11px] tracking-[0.06em] text-white/70 md:mt-14 md:flex-row md:items-center md:justify-between md:text-[12px]">
          <p>© 2026 HOVER. All Rights Reserved.</p>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-6">
            <p>停機坪國際文創股份有限公司 | 90230279</p>
            <a
              href="https://www.jeek-webdesign.com.tw/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/60 transition-opacity hover:opacity-80"
            >
              Design by Jeek-WebDesign
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
