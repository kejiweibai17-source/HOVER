import type { Metadata } from "next";
import Image from "next/image";

export const metadata: Metadata = {
  title: "HOVER｜網站建置中",
  description: "HOVER 官方網站建置中，即將開放。",
  robots: { index: false, follow: false },
};

export default function ComingSoonPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#f7f6f3] px-6 py-16 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% 0%, #e4ebe9 0%, transparent 55%), linear-gradient(180deg, #f7f6f3 0%, #eef2f1 100%)",
        }}
      />

      <div className="relative z-10 flex max-w-md flex-col items-center gap-10">
        <Image
          src="/images/logo/title-logo.svg"
          alt="HOVER"
          width={220}
          height={48}
          priority
          className="h-10 w-auto md:h-12"
        />

        <div className="space-y-4">
          <p className="text-[11px] font-medium tracking-[0.28em] text-[#2a514d]/70">
            COMING SOON
          </p>
          <h1
            className="text-[28px] leading-tight tracking-[0.08em] text-[#2a514d] md:text-[36px]"
            style={{ fontFamily: "DF-01, 'Noto Serif HK', serif" }}
          >
            網站建置中
          </h1>
          <p className="text-[14px] leading-relaxed tracking-[0.04em] text-[#2a514d]/85 md:text-[15px]">
            HOVER 官方網站即將開放，敬請期待。
          </p>
        </div>

        <a
          href="https://www.hoverofficial.com/"
          className="text-[12px] tracking-[0.12em] text-[#2a514d]/55 transition-opacity hover:opacity-70"
        >
          hoverofficial.com
        </a>
      </div>
    </div>
  );
}
