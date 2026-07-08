"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { useRouter } from "next/navigation";
import WishlistIcon from "@/components/hover/WishlistIcon";
import { useWishlistStore } from "@/lib/wishlistStore";
import { useAuthStore } from "@/lib/authStore";
import InfiniteCarousel from "@/components/hover/InfiniteCarousel";
import HoverPopup from "@/components/hover/HoverPopup";
import HoverHero from "@/components/hover/HoverHero";

/* ─── Data ──────────────────────────────────────────────────────────── */

const PRODUCTS = [
  {
    id: "hover-product-1",
    href: "/products/chambray-ribbon-shirt",
    name: "ChambrayRIBBONSHIRT",
    image: "/images/hover/product-1.jpg",
    isNew: false,
    originalPrice: 1280,
    colorLabel: "藍",
    colorHex: "#9ab3d4",
    colors: [
      { label: "藍", hex: "#9ab3d4" },
      { label: "黑", hex: "#111111" },
      { label: "白", hex: "#ffffff" },
    ],
    gallery: [
      "/images/hover/product-1.jpg",
      "/images/hover/product-2.jpg",
      "/images/hover/product-3.jpg",
      "/images/hover/product-4.jpg",
    ],
    description:
      "以輕盈丹寧面料打造的日常襯衫，俐落剪裁搭配細緻織帶細節，適合層疊穿搭或單穿，展現 HOVER 的簡約質感。",
  },
  {
    id: "hover-product-2",
    href: "/products/chambray-ribbon-shirt-2",
    name: "ChambrayRIBBONSHIRT",
    image: "/images/hover/product-2.jpg",
    isNew: true,
    originalPrice: 1280,
    soldOut: true,
    colorLabel: "藍",
    colorHex: "#9ab3d4",
    colors: [{ label: "藍", hex: "#9ab3d4" }],
    gallery: [
      "/images/hover/product-2.jpg",
      "/images/hover/product-1.jpg",
      "/images/hover/people-2.jpg",
    ],
    description:
      "經典丹寧襯衫的升級版本，以織帶元素點綴衣身輪廓，呈現中性而現代的日常風格。",
  },
  {
    id: "hover-product-3",
    href: "/products/chambray-ribbon-shirt-3",
    name: "ChambrayRIBBONSHIRT",
    image: "/images/hover/product-3.jpg",
    isNew: true,
    originalPrice: 1280,
    colorLabel: "藍",
    colorHex: "#b8cad8",
    colors: [
      { label: "藍", hex: "#b8cad8" },
      { label: "黑", hex: "#111111" },
    ],
    gallery: [
      "/images/hover/product-3.jpg",
      "/images/hover/people-3.jpg",
      "/images/hover/product-1.jpg",
    ],
    description:
      "柔和色調的丹寧襯衫，透氣舒適的材質適合春夏日常，輕鬆搭配各種下著。",
  },
  {
    id: "hover-product-4",
    href: "/products/chambray-ribbon-shirt-4",
    name: "ChambrayRIBBONSHIRT",
    image: "/images/hover/product-4.jpg",
    isNew: false,
    originalPrice: 1280,
    soldOut: true,
    colorLabel: "藍",
    colorHex: "#9ab3d4",
    colors: [{ label: "藍", hex: "#9ab3d4" }],
    gallery: ["/images/hover/product-4.jpg", "/images/hover/people-4.jpg"],
    description:
      "深藍丹寧襯衫，簡約線條與織帶細節相互平衡，是衣櫃中不可或缺的百搭單品。",
  },
];

const PEOPLE = [
  "/images/hover/people-1.jpg",
  "/images/hover/people-2.jpg",
  "/images/hover/people-3.jpg",
  "/images/hover/people-4.jpg",
  "/images/hover/people-1.jpg",
  "/images/hover/people-2.jpg",
];

// 輪播用假資料（重複一組，之後可換 API）
const CAROUSEL_PRODUCTS = [
  ...PRODUCTS,
  ...PRODUCTS.map((p, i) => ({
    ...p,
    id: `${p.id}-dup-${i}`,
  })),
];

const PEOPLE_ITEMS = PEOPLE.map((src, i) => ({
  id: `people-${i}`,
  src,
}));

const BRAND_STORY_SLIDES = [
  {
    id: "brand-story-1",
    src: "https://united-arrows-global.com/cdn/shop/files/bnr_global_1600_900_w.jpg?v=1782724871&width=2400",
    alt: "HOVER brand story 1",
  },
  {
    id: "brand-story-2",
    src: "https://united-arrows-global.com/cdn/shop/files/collection_top_1600_900.jpg?v=1782727109&width=2000",
    alt: "HOVER brand story 2",
  },
  {
    id: "brand-story-3",
    src: "https://united-arrows-global.com/cdn/shop/files/WOMEN_PC_b0601636-c7ee-401e-a411-8cb83323cbef.jpg?v=1779843749&width=2000",
    alt: "HOVER brand story 3",
  },
  {
    id: "brand-story-4",
    src: "https://united-arrows-global.com/cdn/shop/files/MEN_PC_7c49d7ce-4819-48ea-a1ba-1b91031081d1.jpg?v=1779843749&width=2000",
    alt: "HOVER brand story 4",
  },
];

const CATEGORIES = [
  {
    label: "TOPS",
    heroText: "ALL BLACK\nCOLLECTION",
    href: "/products?category=tops",
    image: "/images/hover/category-1.jpg",
  },
  {
    label: "HEADWEARS",
    href: "/products?category=headwear",
    image: "/images/hover/category-2.jpg",
  },
  {
    label: "SOCKS",
    href: "/products?category=socks",
    image: "/images/hover/category-3.jpg",
  },
  {
    label: "BAGS",
    href: "/products?category=bags",
    image: "/images/hover/category-2.jpg",
  },
];

/* ─── Section 3 & 6 · Product Grid (NEW ARRIVALS / BEST SELLER) ─────── */

function ProductCard({ product }) {
  const router = useRouter();
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const hasItem = useWishlistStore((s) => s.hasItem);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const isSaved = hasItem(product.id);
  const [wishlistPending, setWishlistPending] = useState(false);

  const slug = product.href.replace(/^\/products\//, "");

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

  const hoverImage = product.gallery?.[1] ?? product.image;
  const hasHoverImage = hoverImage !== product.image;

  return (
    <article className="group relative flex min-w-0 w-full flex-col overflow-hidden">
      {/* Image + badges + wishlist */}
      <div className="relative aspect-[404/479] overflow-hidden bg-white">
        <Link href={product.href} className="absolute inset-0 block">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className={`object-cover transition-opacity duration-500 ${
              hasHoverImage ? "opacity-100 group-hover:opacity-0" : ""
            }`}
            sizes="(max-width: 768px) 50vw, 25vw"
          />
          {hasHoverImage && (
            <Image
              src={hoverImage}
              alt={`${product.name} alternate view`}
              fill
              className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          )}
        </Link>

        {product.isNew && (
          <span className="pointer-events-none absolute left-2 top-2 z-20 bg-white px-2 py-0.5 text-[10px] font-semibold tracking-widest text-black md:left-3 md:top-3">
            NEW
          </span>
        )}
      </div>

      {/* Info */}
      <div className="mt-2 min-w-0 space-y-1 pr-1 text-left md:mt-3">
        <div className="flex min-h-9 min-w-0 items-center justify-between gap-2">
          <Link
            href={product.href}
            className="flex min-w-0 flex-1 items-center break-words text-[12px] font-semibold leading-snug text-black line-clamp-2 hover:opacity-60 md:text-[13px]"
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

        <div className="flex min-w-0 items-center gap-1.5 pt-0.5">
          <span
            className="inline-block h-3 w-3 shrink-0 rounded-full border border-[#ccc]"
            style={{ background: product.colorHex }}
          />
          <span className="truncate text-[10px] text-[#888] md:text-[11px]">
            {product.colorLabel}
          </span>
        </div>

        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5 pt-0.5">
          <span className="text-[12px] font-bold text-[#222] md:text-[13px]">
            NT {product.originalPrice}
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
      imageAspectRatio="404/479"
      renderItem={(product) => <ProductCard product={product} />}
    />
  );
}

/* ─── Section 4 · Brand Story ────────────────────────────────────────── */

function BrandStorySection() {
  return (
    <section className="bg-hover-bg">
      <InfiniteCarousel
        items={BRAND_STORY_SLIDES}
        visibleMd={2}
        visibleSm={1}
        className="bg-hover-bg pb-0"
        contentClassName="px-0"
        trackContentClassName="!py-0 px-0"
        autoplayInterval={5000}
        mobileDraggable
        imageAspectRatio="16/9"
        renderItem={(slide) => (
          <div className="relative aspect-[16/9] max-h-[100vh] w-full overflow-hidden">
            <Image
              src={slide.src}
              alt={slide.alt || "HOVER brand story"}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>
        )}
      />
    </section>
  );
}

/* ─── Section 5 · Category Grid ──────────────────────────────────────── */

function CategoryGrid() {
  return (
    <section className="grid grid-cols-2 md:grid-cols-4">
      {CATEGORIES.map((cat) => (
        <Link
          key={cat.label}
          href={cat.href}
          className="group relative block overflow-hidden"
          style={{ aspectRatio: "482 / 554" }}
        >
          <Image
            src={cat.image}
            alt={cat.label}
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

function HoverPeopleSection() {
  return (
    <InfiniteCarousel
      title="HOVER PEOPLE"
      headerClassName="pb-2"
      items={PEOPLE_ITEMS}
      visibleMd={4}
      visibleSm={3}
      className="pb-0"
      trackContentClassName="px-0 md:px-16"
      slideClassName="md:pr-3"
      mobileAutoplayInterval={4500}
      mobileDraggable
      imageAspectRatio="481/550"
      renderItem={(person, i) => (
        <div className="relative aspect-[481/550] overflow-hidden">
          <Image
            src={person.src}
            alt={`HOVER PEOPLE ${(i % PEOPLE.length) + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </div>
      )}
    />
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */
/* HoverHeader & HoverFooter are rendered globally by ClientLayout */

export default function Home({ initialHero = null }) {
  return (
    <div className="bg-white">
      <HoverPopup />
      <HoverHero initialHero={initialHero} />
      <ProductSection title="NEW ARRIVALS" products={CAROUSEL_PRODUCTS} />
      <BrandStorySection />
      <CategoryGrid />
      <ProductSection title="BEST SELLER" products={CAROUSEL_PRODUCTS} />
      <HoverPeopleSection />
    </div>
  );
}
