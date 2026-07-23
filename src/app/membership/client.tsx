"use client";

import Image from "next/image";

export default function MembershipClient() {
  return (
    <div className="relative bg-white pb-20">
      <header className="px-4 pb-8 pt-14 text-center md:pb-10 md:pt-20">
        <h1 className="font-serif text-[28px] font-medium tracking-[0.12em] text-[#2a514d] md:text-[32px]">
          會員制度
        </h1>
      </header>

      <div className="mx-auto w-full max-w-[960px] px-4 md:px-6">
        <Image
          src="/images/會員制度.jpg"
          alt="HOVER 會員制度"
          width={1920}
          height={2400}
          priority
          className="mx-auto h-auto w-full object-contain"
          sizes="(max-width: 960px) 100vw, 960px"
        />
      </div>
    </div>
  );
}
