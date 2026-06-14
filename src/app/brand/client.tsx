"use client";

import { Link } from "next-view-transitions";

interface FAQ {
  question: string;
  answer: string;
}

interface ClientProps {
  faqs?: FAQ[];
}

export default function Client({ faqs = [] }: ClientProps) {
  return (
    <div className="bg-hover-bg">
      <section className="mx-auto max-w-[900px] px-4 py-20 text-center md:px-8 md:py-28">
        <p className="mb-4 text-[13px] tracking-[0.3em] text-[#555] uppercase">
          BRAND STORY
        </p>
        <h1 className="mb-8 text-[28px] font-bold leading-snug text-black md:text-[36px]">
          輕盈與穩定之間的
          <br />
          生活態度
        </h1>
        <p className="mx-auto max-w-[560px] text-[14px] leading-[2] text-[#555]">
          HOVER 是一個為日常而設計的服飾品牌。我們精選兼具舒適、質感與實穿性的服飾單品，
          在輕盈與穩定之間，找到屬於你的日常風格。
        </p>
        <Link
          href="/products"
          className="mt-10 inline-block bg-[#2a514d] px-8 py-3 text-[13px] tracking-widest text-white transition-colors hover:bg-[#1e3d3a]"
        >
          探索全系列商品
        </Link>
      </section>

      {faqs.length > 0 && (
        <section className="border-t border-[#e8e8e8] bg-white py-16">
          <div className="mx-auto max-w-[720px] px-4 md:px-8">
            <h2 className="mb-10 text-center text-[20px] font-semibold text-black">
              常見問題
            </h2>
            <div className="space-y-6">
              {faqs.map((faq) => (
                <div
                  key={faq.question}
                  className="border-b border-[#eee] pb-6 last:border-0"
                >
                  <h3 className="mb-2 text-[15px] font-medium text-black">
                    {faq.question}
                  </h3>
                  <p className="text-[14px] leading-relaxed text-[#555]">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
