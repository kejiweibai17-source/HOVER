"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback } from "react";
import ProductCard from "./ProductCard";

export default function ProductCarousel({ title, products = [] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    slidesToScroll: 1,
    containScroll: "trimSnaps",
  });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <section className="bg-hover-bg px-4 py-12 md:px-8 md:py-16 lg:px-14">
      <div className="mx-auto max-w-[1920px]">
        <h2 className="mb-8 text-[20px] tracking-wide text-black md:text-[24px]">{title}</h2>

        <div className="relative">
          <button
            type="button"
            onClick={scrollPrev}
            aria-label="上一組商品"
            className="absolute -left-2 top-[40%] z-10 flex h-[52px] w-[51px] items-center justify-center bg-[rgba(42,81,77,0.2)] text-[#2a514d] transition-colors hover:bg-[rgba(42,81,77,0.35)] md:-left-4"
          >
            <ChevronLeft size={22} />
          </button>

          <div className="overflow-hidden px-8 md:px-12" ref={emblaRef}>
            <div className="flex gap-4 md:gap-6">
              {products.map((product) => (
                <div
                  key={`${title}-${product.name}-${product.image}`}
                  className="min-w-0 flex-[0_0_75%] sm:flex-[0_0_45%] lg:flex-[0_0_23%]"
                >
                  <ProductCard {...product} />
                </div>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={scrollNext}
            aria-label="下一組商品"
            className="absolute -right-2 top-[40%] z-10 flex h-[52px] w-[51px] items-center justify-center bg-[rgba(42,81,77,0.2)] text-[#2a514d] transition-colors hover:bg-[rgba(42,81,77,0.35)] md:-right-4"
          >
            <ChevronRight size={22} />
          </button>
        </div>
      </div>
    </section>
  );
}
