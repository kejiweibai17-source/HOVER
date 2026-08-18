"use client";

import { useState } from "react";
import { Link } from "next-view-transitions";
import { useRouter } from "next/navigation";
import WishlistIcon from "@/components/hover/WishlistIcon";
import OptimizedImage from "@/components/hover/OptimizedImage";
import { useWishlistStore } from "@/lib/wishlistStore";
import { useAuthStore } from "@/lib/authStore";
import InfiniteCarousel from "@/components/hover/InfiniteCarousel";
import HoverPopup from "@/components/hover/HoverPopup";
import HoverHero from "@/components/hover/HoverHero";
import HoverMidVideo from "@/components/hover/HoverMidVideo";
import { FALLBACK_BRAND_STORY_SLIDES } from "@/lib/brandStoryDefaults";
import { FALLBACK_CATEGORY_TILES } from "@/lib/categoryGridDefaults";
import { FALLBACK_PEOPLE_SLIDES } from "@/lib/peopleDefaults";
import { FALLBACK_HOME_PRODUCTS } from "@/lib/homeProductsDefaults";
import { formatProductPrice } from "@/lib/utils";
import { pickProductHoverSrc } from "@/lib/productCardImages";

// 預設 HOVER PEOPLE 圖（後台「HOVER PEOPLE」未設定時使用）
const PEOPLE_ITEMS = FALLBACK_PEOPLE_SLIDES;

// 預設品牌故事圖（後台「HOVER 品牌輪播」未設定時使用）
const BRAND_STORY_SLIDES = FALLBACK_BRAND_STORY_SLIDES;

// 預設分類格（後台「HOVER 分類格」未設定時使用）
const CATEGORIES = FALLBACK_CATEGORY_TILES;

/* ─── Section 3 & 6 · Product Grid (NEW ARRIVALS / BEST SELLER) ─────── */

function ProductCard({ product }) {
  const router = useRouter();
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const hasItem = useWishlistStore((s) => s.hasItem);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const isSaved = hasItem(product.id);
  const [wishlistPending, setWishlistPending] = useState(false);

  const slug = String(product.href || "").replace(/^\/products\//, "");

  const handleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (wishlistPending) return;
    setWishlistPending(true);
    const loggedIn = await checkAuth();
    setWishlistPending(false);
    if (!loggedIn) {
      router.push(
        `/login?next=${encodeURIComponent("/account?tab=favorites")}`,
      );
      return;
    }
    toggleItem({
      id: product.id,
      slug,
      name: product.name,
      price: String(product.salePrice ?? product.originalPrice),
      image: product.image,
    });
  };

  const hoverImage = pickProductHoverSrc(
    product.image,
    product.gallery,
    product.hoverImage,
  );
  const hasHoverImage = Boolean(hoverImage && hoverImage !== product.image);
  const [hoverReady, setHoverReady] = useState(false);

  return (
    <article className="group relative flex min-w-0 w-full flex-col overflow-hidden">
      {/* Image + badges + wishlist */}
      <div
        className="relative aspect-[3/4] overflow-hidden bg-white"
        onMouseEnter={() => {
          if (hasHoverImage) setHoverReady(true);
        }}
      >
        <Link
          href={product.href}
          className="absolute inset-0"
        >
          <span className="relative block h-full w-full">
            <OptimizedImage
              src={product.image}
              fullSrc={product.image}
              role="pdp"
              alt={product.name}
              fill
              className={`object-contain transition-opacity duration-300 ${
                hasHoverImage && hoverReady
                  ? "opacity-100 group-hover:opacity-0"
                  : ""
              }`}
              sizes="(max-width: 768px) 50vw, 28vw"
            />
            {hasHoverImage && hoverReady && (
              <OptimizedImage
                src={hoverImage}
                fullSrc={hoverImage}
                role="pdp"
                alt={`${product.name} alternate view`}
                fill
                className="object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                sizes="(max-width: 768px) 50vw, 28vw"
              />
            )}
          </span>
        </Link>
      </div>

      {/* Info */}
      <div className="mt-2 min-w-0 space-y-1 pr-1 text-left md:mt-3">
        <div className="flex min-h-9 min-w-0 items-center justify-between gap-2">
          <Link
            href={product.href}
            className="flex min-w-0 flex-1 items-center break-words text-[14px] font-semibold leading-snug text-black line-clamp-2 hover:opacity-60 md:text-[15px]"
          >
            {product.name}
          </Link>
          <button
            type="button"
            aria-label={isSaved ? "取消收藏" : "加入收藏"}
            onClick={handleWishlist}
            disabled={wishlistPending}
            className={`flex h-9 w-9 shrink-0 items-center justify-center transition-opacity hover:opacity-60 ${
              isSaved ? "opacity-100" : "opacity-80"
            }`}
          >
            <WishlistIcon active={isSaved} size={20} />
          </button>
        </div>

        {product.colorHex ? (
          <div className="flex min-w-0 items-center gap-1.5 pt-0.5">
            <span
              className="inline-block h-3 w-3 shrink-0 rounded-full border border-[#ccc]"
              style={{ background: product.colorHex }}
            />
          </div>
        ) : null}

        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-0.5">
          <span
            className={`text-[14px] font-bold text-[#222] md:text-[15px] ${
              product.soldOut ? "line-through" : ""
            }`}
          >
            {formatProductPrice(product.salePrice ?? product.originalPrice)}
          </span>
          {product.soldOut && (
            <span className="text-[12px] font-bold text-[#222] md:text-[13px]">
              SOLD OUT
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

function ProductSection({ title, products }) {
  return (
    <InfiniteCarousel
      title={title}
      items={products}
      visibleMd={4}
      visibleSm={2}
      className="py-0"
      imageAspectRatio="3/4"
      renderItem={(product) => <ProductCard product={product} />}
    />
  );
}

/* ─── Section 4 · Brand Story ────────────────────────────────────────── */

function BrandStorySection({ slides }) {
  const items = slides && slides.length ? slides : BRAND_STORY_SLIDES;
  return (
    <section className="bg-hover-bg">
      <InfiniteCarousel
        items={items}
        visibleMd={2}
        visibleSm={1}
        className="bg-hover-bg pb-0"
        contentClassName="px-0"
        trackContentClassName="!py-0 px-0"
        slideClassName="pr-0"
        autoplayInterval={5000}
        mobileDraggable
        imageAspectRatio="16/9"
        renderItem={(slide) => {
          const image = (
            <div className="relative aspect-[16/9] max-h-[100vh] w-full overflow-hidden">
              <OptimizedImage
                src={slide.src}
                fullSrc={slide.src}
                role="banner"
                alt={slide.alt || "HOVER brand story"}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          );

          return slide.href ? (
            <Link href={slide.href} className="block">
              {image}
            </Link>
          ) : (
            image
          );
        }}
      />
    </section>
  );
}

/* ─── Section 5 · Category Grid ──────────────────────────────────────── */

function CategoryGrid({ tiles }) {
  const items = tiles && tiles.length ? tiles : CATEGORIES;
  return (
    <section className="grid grid-cols-2 md:grid-cols-4">
      {items.map((cat) => (
        <Link
          key={cat.label}
          href={cat.href}
          className="group relative block overflow-hidden"
          style={{ aspectRatio: "482 / 554" }}
        >
          <OptimizedImage
            src={cat.image}
            fullSrc={cat.image}
            role="banner"
            alt={cat.alt || cat.label}
            fill
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />

          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/35" />

          {/* Hero text (first column only) */}
          {cat.heroText && (
            <p className="absolute left-5 top-8 whitespace-pre-line text-[18px] font-extrabold leading-snug text-white md:text-[22px]">
              {cat.heroText}
            </p>
          )}

          {/* Category label + underline */}
          <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
            <span className="text-[14px] font-bold tracking-[0.18em] text-white md:text-[16px]">
              {cat.label}
            </span>
            <span className="h-px w-12 bg-white transition-all duration-300 group-hover:w-16" />
          </div>
        </Link>
      ))}
    </section>
  );
}

/* ─── Section 7 · HOVER PEOPLE ───────────────────────────────────────── */

function HoverPeopleSection({ slides }) {
  const items = slides && slides.length ? slides : PEOPLE_ITEMS;
  return (
    <InfiniteCarousel
      title="HOVER PEOPLE"
      headerClassName="pb-2"
      items={items}
      visibleMd={4}
      visibleSm={3}
      className="pb-0"
      trackContentClassName="px-0 md:px-16"
      slideClassName="md:pr-3"
      mobileAutoplayInterval={4500}
      mobileDraggable
      imageAspectRatio="481/550"
      renderItem={(person, i) => {
        const image = (
          <div className="relative aspect-[481/550] overflow-hidden">
            <OptimizedImage
              src={person.src}
              fullSrc={person.src}
              role="card"
              alt={person.alt || `HOVER PEOPLE ${(i % items.length) + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          </div>
        );

        return person.href ? (
          <Link href={person.href} className="block">
            {image}
          </Link>
        ) : (
          image
        );
      }}
    />
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */
/* HoverHeader & HoverFooter are rendered globally by ClientLayout */

export default function Home({
  initialHero = null,
  initialBrandStory = null,
  initialMidVideo = null,
  initialCategoryGrid = null,
  initialPeople = null,
  initialNewArrivals = null,
  initialBestSeller = null,
}) {
  const newArrivals = Array.isArray(initialNewArrivals)
    ? initialNewArrivals
    : FALLBACK_HOME_PRODUCTS;
  const bestSeller = Array.isArray(initialBestSeller)
    ? initialBestSeller
    : FALLBACK_HOME_PRODUCTS;

  return (
    <div className="bg-white">
      <HoverPopup />
      <HoverHero initialHero={initialHero} />
      <ProductSection title="NEW ARRIVALS" products={newArrivals} />
      <BrandStorySection slides={initialBrandStory} />
      <HoverMidVideo initialSettings={initialMidVideo} />
      <CategoryGrid tiles={initialCategoryGrid} />
      <ProductSection title="BEST SELLER" products={bestSeller} />
      <HoverPeopleSection slides={initialPeople} />
    </div>
  );
}
