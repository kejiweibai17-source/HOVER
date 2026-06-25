"use client";

import Image from "next/image";

const BRAND_BG = "/images/brand/280d8452-422a-4056-a5db-bea5277f5f5e.png";

export default function Client() {
  return (
    <section className="relative min-h-[calc(100vh-var(--hover-header-height,116px))] w-full overflow-hidden bg-[#f3efe8]">
      <Image
        src={BRAND_BG}
        alt="HOVER 品牌故事"
        fill
        priority
        className="object-cover object-[center_45%] md:object-center"
        sizes="100vw"
      />

      <div className="relative z-10 flex min-h-[calc(100vh-var(--hover-header-height,116px))] flex-col justify-center px-6 py-12 sm:px-10 md:px-14 md:py-16 lg:pl-[7%] lg:pr-[48%] xl:pl-[8%]">
        <div className="mb-10 md:mb-14">
          <p className="text-[15px] leading-tight text-[#2a514d] md:text-[16px]">
            Brand
          </p>
          <p className="mt-0.5 text-[15px] leading-tight text-[#2a514d] md:text-[16px]">
            Story
          </p>
        </div>

        <h1 className="max-w-[520px] font-serif text-[24px] font-medium leading-[1.65] tracking-[0.03em] text-[#2a514d] sm:text-[28px] md:text-[34px] lg:text-[38px]">
          HOVER相信
          <br />
          真正的風格，不是被定義，
          <br />
          而是回到自己。
        </h1>

        <div className="my-7 h-px w-full max-w-[min(100%,420px)] bg-[#2a514d]/75 md:my-9" />

        <p className="max-w-[420px] text-[12px] leading-[2.1] tracking-[0.06em] text-[#2a514d] sm:text-[13px] md:text-[14px]">
          我們不追逐流行，只願找到屬於自己的經典
          <br />
          陪你走過每一個日常，成為自己喜歡的樣子
        </p>
      </div>
    </section>
  );
}
