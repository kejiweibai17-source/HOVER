"use client";

import { useState } from "react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";
import { useCartStore } from "@/lib/cartStore";
import { useWishlistStore } from "@/lib/wishlistStore";
import { useAuthStore } from "@/lib/authStore";
import QuickViewModal from "@/components/hover/QuickViewModal";

/* ─── Data ──────────────────────────────────────────────────────────── */

const PRODUCTS = [
  {
    id: "hover-product-1",
    href: "/products/chambray-ribbon-shirt",
    category: "DRAWER",
    name: "ChambrayRIBBONSHIRT",
    image: "/images/hover/product-1.jpg",
    isNew: false,
    originalPrice: 1690,
    salePrice: 1290,
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
    category: "DRAWER",
    name: "ChambrayRIBBONSHIRT",
    image: "/images/hover/product-2.jpg",
    isNew: true,
    originalPrice: 2690,
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
    category: "DRAWER",
    name: "ChambrayRIBBONSHIRT",
    image: "/images/hover/product-3.jpg",
    isNew: true,
    originalPrice: 1690,
    salePrice: 1290,
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
    category: "DRAWER",
    name: "ChambrayRIBBONSHIRT",
    image: "/images/hover/product-4.jpg",
    isNew: false,
    originalPrice: 2690,
    soldOut: true,
    colorLabel: "藍",
    colorHex: "#9ab3d4",
    colors: [{ label: "藍", hex: "#9ab3d4" }],
    gallery: [
      "/images/hover/product-4.jpg",
      "/images/hover/people-4.jpg",
    ],
    description:
      "深藍丹寧襯衫，簡約線條與織帶細節相互平衡，是衣櫃中不可或缺的百搭單品。",
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

const PEOPLE = [
  "/images/hover/people-1.jpg",
  "/images/hover/people-2.jpg",
  "/images/hover/people-3.jpg",
  "/images/hover/people-4.jpg",
];

/* ─── Section 2 · Hero ───────────────────────────────────────────────── */

const HERO_BANNER_SRC = "/images/hover/hero.jpg";

function HeroSection() {
  return (
    <section className="relative w-full overflow-hidden">
      <Image
        src={HERO_BANNER_SRC}
        alt="HOVER"
        width={2400}
        height={1100}
        priority
        sizes="100vw"
        className="h-[85vh] min-h-[560px] w-full object-cover object-top"
      />

      <Link
        href="/products"
        className="group absolute bottom-14 left-1/2 flex -translate-x-1/2 flex-col items-center text-white"
      >
        <span className="font-serif text-[18px] tracking-widest md:text-[22px]">
          SHOP NOW
        </span>
        <span className="mt-2 h-px w-[120px] bg-white transition-all duration-300 group-hover:w-[160px]" />
      </Link>
    </section>
  );
}

/* ─── Section 3 & 6 · Product Grid (NEW ARRIVALS / BEST SELLER) ─────── */

function ProductCard({ product, onQuickView }) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
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
      router.push(`/login?next=${encodeURIComponent("/account?tab=favorites")}`);
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

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (product.soldOut) return;
    addItem({
      id: product.id,
      name: product.name,
      price: product.salePrice ?? product.originalPrice,
      qty: 1,
      image: product.image,
      options: { 顏色: product.colorLabel, 尺寸: "M" },
    });
  };

  const handleQuickView = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onQuickView(product);
  };

  return (
    <article className="group relative flex flex-col">
      {/* Image + badges + hover actions */}
      <div className="relative aspect-[404/479] overflow-hidden bg-[#e8e8e8]">
        <Link href={product.href} className="absolute inset-0 block">
          <Image
            src={product.image}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </Link>

        {/* NEW badge */}
        {product.isNew && (
          <span className="pointer-events-none absolute left-3 top-3 z-20 bg-white px-2 py-0.5 text-[10px] font-semibold tracking-widest text-black">
            NEW
          </span>
        )}

        {/* Wishlist heart */}
        <button
          type="button"
          aria-label={isSaved ? "取消收藏" : "加入收藏"}
          onClick={handleWishlist}
          disabled={wishlistPending}
          className={`absolute right-3 top-3 z-20 transition-opacity ${
            isSaved
              ? "text-rose-500 opacity-100"
              : "text-[#aaa] opacity-0 group-hover:opacity-100"
          }`}
        >
          <Heart
            size={16}
            strokeWidth={1.5}
            fill={isSaved ? "currentColor" : "none"}
          />
        </button>

        {/* Shopify-style hover overlay */}
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-black/10 px-4 opacity-100 transition-all duration-300 md:bg-black/0 md:opacity-0 md:group-hover:bg-black/25 md:group-hover:opacity-100">
          <button
            type="button"
            onClick={handleQuickView}
            className="w-full max-w-[180px] bg-white py-2.5 text-[11px] font-semibold tracking-[0.14em] text-black transition-colors hover:bg-[#f5f5f5]"
          >
            快速查看
          </button>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={product.soldOut}
            className={`w-full max-w-[180px] py-2.5 text-[11px] font-semibold tracking-[0.14em] transition-colors ${
              product.soldOut
                ? "cursor-not-allowed bg-[#ccc] text-white"
                : "bg-[#2a514d] text-white hover:bg-[#1e3d3a]"
            }`}
          >
            {product.soldOut ? "已售完" : "加入購物車"}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="mt-3 space-y-1">
        <p className="text-[11px] tracking-widest text-[#888]">
          {product.category}
        </p>
        <Link
          href={product.href}
          className="block text-[13px] font-semibold text-black hover:opacity-60"
        >
          {product.name}
        </Link>

        {/* Color swatch */}
        <div className="flex items-center gap-2 pt-0.5">
          <span
            className="inline-block h-3 w-3 rounded-full border border-[#ccc]"
            style={{ background: product.colorHex }}
          />
          <span className="text-[11px] text-[#888]">{product.colorLabel}</span>
        </div>

        {/* Price */}
        <div className="flex items-center gap-3 pt-0.5">
          {product.soldOut ? (
            <>
              <span className="text-[12px] text-[#b3b3b3] line-through">
                NT. {product.originalPrice}
              </span>
              <span className="text-[13px] font-bold text-[#222]">
                SOLD OUT
              </span>
            </>
          ) : (
            <>
              <span className="text-[12px] text-[#b3b3b3] line-through">
                NT. {product.originalPrice}
              </span>
              <span className="text-[13px] font-bold text-[#222]">
                NT. {product.salePrice}
              </span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

function ProductSection({ title, products, onQuickView }) {
  return (
    <section className="relative bg-hover-bg px-10 py-12 md:px-16">
      <h2 className="mb-6 text-[15px] font-semibold tracking-[0.12em] text-black">
        {title}
      </h2>

      {/* Prev arrow */}
      <button
        type="button"
        aria-label="上一組"
        className="absolute left-2 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center bg-hover-bg/80 text-[#555] hover:bg-white md:left-4"
      >
        <ChevronLeft size={20} strokeWidth={1.5} />
      </button>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
        {products.map((p) => (
          <ProductCard
            key={`${title}-${p.id}`}
            product={p}
            onQuickView={onQuickView}
          />
        ))}
      </div>
    </section>
  );
}

/* ─── Section 4 · Brand Story ────────────────────────────────────────── */

function BrandStorySection() {
  return (
    <section className="grid h-[85vh] bg-hover-bg md:grid-cols-[58%_42%]">
      {/* Left — photo */}
      <div className="relative min-h-[380px] overflow-hidden md:min-h-[600px]">
        <Image
          src="/images/hover/brand-story.jpg"
          alt="HOVER brand story"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 58vw"
        />
        {/* "HOVER" overlay bottom-left */}
        <span className="absolute bottom-8 left-8 font-black text-[36px] leading-none tracking-tight text-black mix-blend-multiply opacity-90 md:text-[52px]">
          HOVER
        </span>
      </div>

      {/* Right — brand text */}
      <div className="my-10 flex flex-col items-center justify-between bg-hover-bg px-10 py-12 md:px-14 md:py-16">
        {/* Vertical text columns */}
        <div className="flex justify-end gap-6">
          <p className="[writing-mode:vertical-rl] text-[22px] leading-[1.6] tracking-[0.25em] text-black md:text-[26px]">
            輕盈與穩定之間的
          </p>
          <p className="[writing-mode:vertical-rl] text-[22px] leading-[1.6] tracking-[0.25em] text-black md:text-[26px]">
            生活態度、
          </p>
        </div>

        {/* Description */}
        <p className="mt-8 max-w-[280px] text-right text-[12px] leading-[2] tracking-wide text-[#4d4b48] md:text-[13px]">
          HOVER 是一個不被性別框架限制的日常服飾品牌。
          <br />
          我們精選兼具舒適、質感與實穿性的服飾單品，
          <br />
          讓每個人都能依照自己的生活節奏，自在選擇穿搭。
        </p>
      </div>
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
          <div className="absolute bottom-6 left-5 flex flex-col gap-2">
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
    <section className="bg-hover-bg">
      <div className="px-10 pb-6 pt-12 md:px-16">
        <h2 className="text-[22px] font-black tracking-[0.28em] text-black md:text-[28px]">
          HOVER PEOPLE
        </h2>
      </div>

      {/* Edge-to-edge 4-col photo strip */}
      <div className="grid grid-cols-2 md:grid-cols-4">
        {PEOPLE.map((src, i) => (
          <div key={src} className="relative aspect-[481/550] overflow-hidden">
            <Image
              src={src}
              alt={`HOVER PEOPLE ${i + 1}`}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 50vw, 25vw"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────── */
/* HoverHeader & HoverFooter are rendered globally by ClientLayout */

export default function Home() {
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  return (
    <div className="bg-hover-bg">
      <HeroSection />
      <ProductSection
        title="NEW ARRIVALS"
        products={PRODUCTS}
        onQuickView={setQuickViewProduct}
      />
      <BrandStorySection />
      <CategoryGrid />
      <ProductSection
        title="BEST SELLER"
        products={PRODUCTS}
        onQuickView={setQuickViewProduct}
      />
      <HoverPeopleSection />

      <QuickViewModal
        product={quickViewProduct}
        onClose={() => setQuickViewProduct(null)}
      />
    </div>
  );
}
