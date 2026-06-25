// app/products/[slug]/Client.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { useRouter, useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import WishlistIcon from "@/components/hover/WishlistIcon";
import { useCartStore } from "@/lib/cartStore";
import { useWishlistStore } from "@/lib/wishlistStore";
import { useAuthStore } from "@/lib/authStore";

interface FAQ {
  question: string;
  answer: string;
}

interface ProductProps {
  product: {
    id: string;
    name: string;
    subname?: string;
    price: number;
    regularPrice: number;
    salePrice: number | null;
    shortDescription: string;
    description: string;
    images: string[];
    attributes: { name: string; options: string[] }[];
    acf: any;
  };
  faqs?: FAQ[];
}

const MOCK_GALLERY = [
  "/images/hover/pdp-main-1.jpg",
  "/images/hover/product-2.jpg",
  "/images/hover/people-3.jpg",
  "/images/hover/product-4.jpg",
  "/images/hover/product-1.jpg",
  "/images/hover/product-3.jpg",
  "/images/hover/people-4.jpg",
];

const COLORS = [
  { label: "紅", hex: "#b20000" },
  { label: "黑", hex: "#111111" },
  { label: "粉", hex: "#ffe0f4" },
  { label: "白", hex: "#ffffff" },
];

const SIZES = ["S", "M", "L", "XL"];
const MOBILE_SIZES = ["S", "M", "L", "XL", "2XL"];

const SIZE_GUIDE = {
  headers: ["尺寸(公分)", "S", "M", "L", "XL"],
  rows: [
    ["肩寬", "41", "45.5", "48.5", "54"],
    ["胸寬", "48.5", "52", "55", "58.5"],
    ["衣長", "65", "69.5", "72", "76.5"],
    ["袖長", "18.5", "20", "21.5", "24"],
  ],
};

function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-[#d8d8d8]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between py-4 text-left"
      >
        <span className="text-[15px] text-[#363636]">{title}</span>
        <span className="text-[20px] font-light leading-none text-[#363636]">
          {open ? "−" : "+"}
        </span>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${
          open ? "max-h-[1200px] pb-6 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function ProductGallery({
  images,
  name,
  part = "all",
}: {
  images: string[];
  name: string;
  part?: "all" | "hero" | "rest";
}) {
  const [index, setIndex] = useState(0);
  const heroTail = images.slice(1, 3);
  const gridImages = images.slice(3);
  const total = images.length;
  const showHero = part === "all" || part === "hero";
  const showRest = part === "all" || part === "rest";

  const go = (delta: number) => {
    if (total <= 1) return;
    setIndex((prev) => (prev + delta + total) % total);
  };

  return (
    <div className="flex flex-col gap-2">
      {showHero && (
        <div
          className="relative w-full overflow-hidden bg-[#e8e6e2]"
          style={{ aspectRatio: "3/4" }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={images[index]}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-0"
            >
              <Image
                src={images[index]}
                alt={`${name} ${index + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority={index === 0}
              />
            </motion.div>
          </AnimatePresence>

          {total > 1 && (
            <>
              <button
                type="button"
                aria-label="上一張"
                onClick={() => go(-1)}
                className="absolute left-4 top-1/2 z-10 -translate-y-1/2 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)] transition-opacity hover:opacity-70 md:left-6"
              >
                <ChevronLeft size={30} strokeWidth={1.25} />
              </button>
              <button
                type="button"
                aria-label="下一張"
                onClick={() => go(1)}
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.45)] transition-opacity hover:opacity-70 md:right-6"
              >
                <ChevronRight size={30} strokeWidth={1.25} />
              </button>
            </>
          )}
        </div>
      )}

      {showRest &&
        heroTail.map((src, i) => (
          <div
            key={`hero-${src}-${i}`}
            className="relative w-full overflow-hidden bg-[#e8e6e2]"
            style={{ aspectRatio: "3/4" }}
          >
            <Image
              src={src}
              alt={`${name} ${i + 2}`}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
            />
          </div>
        ))}

      {showRest && gridImages.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {gridImages.map((src, i) => (
            <div
              key={`grid-${src}-${i}`}
              className="relative overflow-hidden bg-[#e8e6e2]"
              style={{ aspectRatio: "3/4" }}
            >
              <Image
                src={src}
                alt={`${name} ${i + 4}`}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                className="object-cover"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductPurchasePanel({
  product,
  isSaved,
  wishlistPending,
  onToggleWishlist,
  selectedColor,
  setSelectedColor,
  selectedSize,
  setSelectedSize,
  qty,
  setQty,
  displayPrice,
  hasDiscount,
  adding,
  onAddToCart,
  isMobile = false,
}: {
  product: ProductProps["product"];
  isSaved: boolean;
  wishlistPending: boolean;
  onToggleWishlist: () => void;
  selectedColor: string;
  setSelectedColor: (v: string) => void;
  selectedSize: string | null;
  setSelectedSize: (v: string) => void;
  qty: number;
  setQty: React.Dispatch<React.SetStateAction<number>>;
  displayPrice: number;
  hasDiscount: boolean;
  adding: boolean;
  onAddToCart: () => void;
  isMobile?: boolean;
}) {
  const sizeOptions = isMobile ? MOBILE_SIZES : SIZES;

  return (
    <>
      <div className={`flex items-start justify-between gap-3 ${isMobile ? "mb-4" : "mb-5 gap-4"}`}>
        <h1
          className={`font-bold uppercase leading-snug tracking-[0.02em] text-black ${
            isMobile ? "text-[14px] leading-[1.45]" : "text-[17px] md:text-[20px]"
          }`}
        >
          {product.name}
        </h1>
        <button
          type="button"
          aria-label={isSaved ? "取消收藏" : "加入收藏"}
          onClick={onToggleWishlist}
          disabled={wishlistPending}
          className={`shrink-0 transition-opacity hover:opacity-70 ${
            isSaved ? "opacity-100" : "opacity-80"
          }`}
        >
          <WishlistIcon active={isSaved} size={isMobile ? 40 : 44} />
        </button>
      </div>

      <div className={`flex flex-wrap items-baseline gap-2 ${isMobile ? "mb-6" : "mb-8 gap-3"}`}>
        {hasDiscount && (
          <span
            className={`text-black line-through opacity-45 ${
              isMobile ? "text-[14px]" : "text-[16px] md:text-[18px]"
            }`}
          >
            NT$ {product.regularPrice.toLocaleString()}
          </span>
        )}
        <span
          className={`font-bold ${
            isMobile ? "text-[16px]" : "text-[18px] md:text-[20px]"
          } ${hasDiscount ? "text-[#c90000]" : "text-black"}`}
        >
          NT$ {displayPrice.toLocaleString()}
        </span>
      </div>

      <div className={isMobile ? "mb-6" : "mb-8"}>
        <p className="mb-3 text-[13px] tracking-[0.06em] text-black">
          COLOR{isMobile ? "：" : " : "}
          {selectedColor}
        </p>
        <div className="flex flex-wrap gap-3">
          {COLORS.map((c) => {
            const active = selectedColor === c.label;
            return (
              <button
                key={c.label}
                type="button"
                aria-label={c.label}
                onClick={() => setSelectedColor(c.label)}
                className={`h-9 w-9 border transition-all md:h-[35px] md:w-[35px] ${
                  active
                    ? "border-black ring-1 ring-black ring-offset-2"
                    : "border-[#ccc] hover:border-[#888]"
                }`}
                style={{ backgroundColor: c.hex }}
              />
            );
          })}
        </div>
      </div>

      <div className={isMobile ? "mb-4" : "mb-3"}>
        <div className="flex flex-wrap gap-3">
          {sizeOptions.map((s) => {
            const active = selectedSize === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedSize(s)}
                className={`flex h-9 w-9 items-center justify-center border text-[13px] font-bold transition-all md:h-[35px] md:w-[35px] ${
                  active
                    ? "border-[#8b8b8b] bg-[#8b8b8b] text-white"
                    : "border-[#ccc] bg-white text-black hover:border-[#888]"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
        {!selectedSize && (
          <p className="mt-2.5 text-[12px] text-[#c90000]">請選擇尺寸</p>
        )}
      </div>

      <p className={`text-[#2a514d] ${isMobile ? "mb-5 text-[13px]" : "mb-6 text-[14px]"}`}>
        {isMobile ? "Unisex 版型偏寬鬆" : "UNISEX(男女皆適穿)"}
      </p>

      <div className={isMobile ? "mb-4" : "mb-4"}>
        <div className="flex h-10 w-full max-w-full items-center border border-black">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            className="flex h-full w-10 items-center justify-center text-black transition-colors hover:bg-black/5"
          >
            <Minus size={14} />
          </button>
          <span className="flex-1 text-center text-[15px] font-medium text-black">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            className="flex h-full w-10 items-center justify-center text-black transition-colors hover:bg-black/5"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onAddToCart}
        disabled={!selectedSize}
        className={`flex h-10 w-full items-center justify-center text-[15px] text-white transition-all ${
          isMobile ? "mb-0" : "mb-10"
        } ${
          selectedSize
            ? "cursor-pointer bg-[#2a514d] hover:bg-[#1e3d3a]"
            : "cursor-not-allowed bg-[#9a9a9a]"
        } ${adding ? "scale-[0.98]" : ""}`}
      >
        {adding ? "已加入購物車 ✓" : "加入購物車"}
      </button>
    </>
  );
}

function ProductDetailAccordions({
  cleanDescription,
  faqs,
  isMobile = false,
}: {
  cleanDescription: string;
  faqs: FAQ[];
  isMobile?: boolean;
}) {
  return (
    <div className={isMobile ? "border-b border-[#d8d8d8]" : undefined}>
      <Accordion title="商品詳情" defaultOpen>
        <div className="space-y-3 text-[14px] leading-[1.7] tracking-[0.06em] text-black">
          {cleanDescription.split("\n").map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      </Accordion>

      <Accordion title="洗滌方式">
        <div className="space-y-2 text-[14px] leading-[1.7] tracking-[0.06em] text-black">
          <p>・建議手洗或機洗冷水輕柔模式</p>
          <p>・請勿使用漂白劑</p>
          <p>・請勿烘乾</p>
          <p>・可低溫熨燙（最高 110°C）</p>
          <p>・洗滌前請將衣物翻面</p>
        </div>
      </Accordion>

      <Accordion title="尺寸指南">
        <div className="text-[13px]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-[#ddd]">
                {SIZE_GUIDE.headers.map((h) => (
                  <th
                    key={h}
                    className="py-2 pr-4 text-left font-medium text-[#555] first:text-[#333]"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SIZE_GUIDE.rows.map(([label, ...vals]) => (
                <tr key={label} className="border-b border-[#eee]">
                  <td className="py-2 pr-4 font-medium text-[#333]">{label}</td>
                  {vals.map((v, i) => (
                    <td key={i} className="py-2 pr-4 text-[#555]">
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-[11px] text-[#888]">
            ※為平放測量，±2cm誤差範圍屬於製作標準範圍內。
          </p>
        </div>
      </Accordion>

      {faqs.length > 0 &&
        faqs.map((faq) => (
          <Accordion key={faq.question} title={faq.question}>
            <p className="text-[14px] leading-relaxed text-[#555]">{faq.answer}</p>
          </Accordion>
        ))}
    </div>
  );
}

export default function ProductClient({ product, faqs = [] }: ProductProps) {
  const router = useRouter();
  const params = useParams();
  const productSlug = typeof params.slug === "string" ? params.slug : "";
  const addItem = useCartStore((s) => s.addItem);
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const hasItem = useWishlistStore((s) => s.hasItem);
  const checkAuth = useAuthStore((s) => s.checkAuth);

  const productId = Number(product.id) || product.id;
  const isSaved = hasItem(productId);

  const gallery =
    product.images && product.images.length > 0 ? product.images : MOCK_GALLERY;

  const [selectedColor, setSelectedColor] = useState(COLORS[0].label);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [wishlistPending, setWishlistPending] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleToggleWishlist = async () => {
    if (wishlistPending) return;
    setWishlistPending(true);
    const loggedIn = await checkAuth();
    setWishlistPending(false);
    if (!loggedIn) {
      router.push(
        `/login?next=${encodeURIComponent(window.location.pathname)}`,
      );
      return;
    }
    toggleItem({
      id: productId,
      slug: productSlug,
      name: product.name,
      price: String(product.salePrice ?? product.price),
      image: gallery[0],
    });
  };

  const displayPrice = product.salePrice ?? product.price;
  const hasDiscount =
    product.salePrice !== null && product.regularPrice > product.salePrice;

  const handleAddToCart = () => {
    if (!selectedSize) return;
    setAdding(true);
    addItem({
      id: `${product.id}-${selectedColor}-${selectedSize}`,
      name: product.name,
      price: displayPrice,
      qty,
      image: gallery[0] || "",
      slug: productSlug,
      options: { 顏色: selectedColor, 尺寸: selectedSize },
    });
    setTimeout(() => setAdding(false), 1000);
  };

  const cleanDescription = product.description
    ? product.description.replace(/<[^>]+>/g, "").trim()
    : "短袖T恤帶有單色鱷魚刺繡的微妙口音。使用的球衣材料與皮克不同，具有細膩的質地，增強了物品的吸引力，儘管它具有休閒性質，但給人一種優雅的印象。\n當與乾淨的褲款搭配時，它創造了一種智慧和精緻的風格。\n它也與牛仔布和短褲等休閒單品完美搭配，使其成為一件自然適合輕鬆週末風格的單品。";

  return (
    <div className="bg-hover-bg">
      <nav className="mx-auto hidden max-w-[1400px] flex-wrap items-center gap-1 px-6 pb-4 pt-5 text-[11px] tracking-[0.04em] text-[#888] md:flex md:px-10 md:pt-6">
        <Link href="/" className="hover:text-black">
          HOME
        </Link>
        <span>&gt;</span>
        <Link href="/products" className="hover:text-black">
          ALL ITEMS
        </Link>
        <span>&gt;</span>
        <span className="text-black">{product.name}</span>
      </nav>

      {/* 桌機 — 雙欄 */}
      <div className="mx-auto hidden max-w-[1400px] grid-cols-2 items-start gap-10 px-10 pb-16 md:grid lg:gap-14">
        <div className="w-full">
          <ProductGallery images={gallery} name={product.name} />
        </div>

        <div className="w-full md:sticky md:top-[calc(var(--hover-header-height,116px)+16px)] md:self-start">
          <ProductPurchasePanel
            product={product}
            isSaved={isSaved}
            wishlistPending={wishlistPending}
            onToggleWishlist={handleToggleWishlist}
            selectedColor={selectedColor}
            setSelectedColor={setSelectedColor}
            selectedSize={selectedSize}
            setSelectedSize={setSelectedSize}
            qty={qty}
            setQty={setQty}
            displayPrice={displayPrice}
            hasDiscount={hasDiscount}
            adding={adding}
            onAddToCart={handleAddToCart}
          />
          <ProductDetailAccordions
            cleanDescription={cleanDescription}
            faqs={faqs}
          />
        </div>
      </div>

      {/* 手機 — 主圖 → 購買資訊 → 手風琴 → 下方圖片區 */}
      <div className="bg-white pb-16 md:hidden">
        <ProductGallery images={gallery} name={product.name} part="hero" />

        <div className="px-5 pt-5">
          <ProductPurchasePanel
            product={product}
            isSaved={isSaved}
            wishlistPending={wishlistPending}
            onToggleWishlist={handleToggleWishlist}
            selectedColor={selectedColor}
            setSelectedColor={setSelectedColor}
            selectedSize={selectedSize}
            setSelectedSize={setSelectedSize}
            qty={qty}
            setQty={setQty}
            displayPrice={displayPrice}
            hasDiscount={hasDiscount}
            adding={adding}
            onAddToCart={handleAddToCart}
            isMobile
          />
        </div>

        <div className="mt-6 px-5">
          <ProductDetailAccordions
            cleanDescription={cleanDescription}
            faqs={faqs}
            isMobile
          />
        </div>

        <div className="mt-6 px-5">
          <ProductGallery
            images={gallery}
            name={product.name}
            part="rest"
          />
        </div>
      </div>
    </div>
  );
}
