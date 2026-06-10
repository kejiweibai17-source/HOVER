// app/products/[slug]/Client.tsx
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { useRouter } from "next/navigation";
import { Heart, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { useCartStore } from "@/lib/cartStore";
import { useWishlistStore } from "@/lib/wishlistStore";
import { useAuthStore } from "@/lib/authStore";

/* ─── Types ──────────────────────────────────────────────────────────────── */

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

/* ─── Mock / fallback data ───────────────────────────────────────────────── */

const MOCK_GALLERY = [
  "/images/hover/pdp-main-1.jpg",
  "/images/hover/product-2.jpg",
  "/images/hover/people-3.jpg",
  "/images/hover/product-4.jpg",
  "/images/hover/people-1.jpg",
  "/images/hover/product-3.jpg",
];

const COLORS = [
  { label: "紅", hex: "#b20000" },
  { label: "黑", hex: "#111111" },
  { label: "粉", hex: "#ffe0f4" },
  { label: "白", hex: "#ffffff" },
];

const SIZES = ["S", "M", "L", "XL"];

const SIZE_GUIDE = {
  headers: ["尺寸(公分)", "S", "M", "L", "XL"],
  rows: [
    ["肩寬", "41", "45.5", "48.5", "54"],
    ["胸寬", "48.5", "52", "55", "58.5"],
    ["衣長", "65", "69.5", "72", "76.5"],
    ["袖長", "18.5", "20", "21.5", "24"],
  ],
};

/* ─── Accordion ──────────────────────────────────────────────────────────── */

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
    <div className="border-t border-[#e0e0e0]">
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

/* ─── Main Component ──────────────────────────────────────────────────────── */

export default function ProductClient({ product, faqs = [] }: ProductProps) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const hasItem = useWishlistStore((s) => s.hasItem);
  const checkAuth = useAuthStore((s) => s.checkAuth);

  const productId = Number(product.id);
  const isSaved = hasItem(productId);

  // Gallery state
  const gallery =
    product.images && product.images.length > 0
      ? product.images
      : MOCK_GALLERY;
  const [activeIdx, setActiveIdx] = useState(0);

  // Product options
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
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    toggleItem({
      id: productId,
      slug: product.id,
      name: product.name,
      price: String(product.salePrice ?? product.price),
      image: gallery[0],
    });
  };

  const displayPrice = product.salePrice ?? product.price;
  const hasDiscount = product.salePrice !== null && product.regularPrice > product.salePrice;

  const handleAddToCart = () => {
    if (!selectedSize) return;
    setAdding(true);
    addItem({
      id: `${product.id}-${selectedColor}-${selectedSize}`,
      name: product.name,
      price: displayPrice,
      qty,
      image: gallery[0] || "",
    });
    setTimeout(() => setAdding(false), 1000);
  };

  const cleanDescription = product.description
    ? product.description.replace(/<[^>]+>/g, "").trim()
    : "短袖T恤帶有單色鱷魚刺繡的微妙口音。SHIRT 它使用的球衣材料與皮克不同，皮克具有細膩的質地，增強了物品的吸引力，儘管它具有休閒性質，但給人一種優雅的印象。\n當與乾淨的SLACKS搭配時，它創造了一種智慧和精緻的風格。\n它也與牛仔布和短褲等休閒單品完美搭配，使其成為一件自然適合輕鬆的週末風格的單品。";

  return (
    <div className="bg-hover-bg">
      {/* ── 2-col layout ─────────────────────────────────────────────── */}
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-4 py-8 md:flex-row md:items-start md:gap-12 md:px-8 md:py-12">

          {/* ── Left: Image gallery ──────────────────────────────────── */}
          <div className="w-full md:sticky md:top-[136px] md:w-[50%]">
            {/* Main large image */}
            <div className="relative w-full overflow-hidden bg-[#e8e6e2]" style={{ aspectRatio: "3/4" }}>
              <Image
                key={gallery[activeIdx]}
                src={gallery[activeIdx]}
                alt={`${product.name} ${activeIdx + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority={activeIdx === 0}
              />

              {/* Prev/Next arrows */}
              {gallery.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveIdx((i) => (i === 0 ? gallery.length - 1 : i - 1))}
                    className="absolute left-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center bg-[rgba(42,81,77,0.2)] text-white hover:bg-[rgba(42,81,77,0.5)] transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveIdx((i) => (i === gallery.length - 1 ? 0 : i + 1))}
                    className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center bg-[rgba(42,81,77,0.2)] text-white hover:bg-[rgba(42,81,77,0.5)] transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {gallery.length > 1 && (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {gallery.slice(0, 4).map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveIdx(i)}
                    className={`relative overflow-hidden border-2 transition-colors ${
                      activeIdx === i ? "border-[#2a514d]" : "border-transparent"
                    }`}
                    style={{ aspectRatio: "3/4" }}
                  >
                    <Image
                      src={src}
                      alt={`${product.name} thumbnail ${i + 1}`}
                      fill
                      sizes="15vw"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* Extra product images (scrolling, below thumbnails) */}
            {gallery.slice(4).map((src, i) => (
              <div
                key={i + 4}
                className="relative mt-2 w-full overflow-hidden bg-[#e8e6e2]"
                style={{ aspectRatio: "3/4" }}
              >
                <Image
                  src={src}
                  alt={`${product.name} ${i + 5}`}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>

          {/* ── Right: Product info ──────────────────────────────────── */}
          <div className="w-full md:w-[50%]">
            {/* Name + wishlist */}
            <div className="mb-4 flex items-start justify-between gap-4">
              <h1 className="text-[20px] font-bold uppercase leading-snug text-black">
                {product.name || "LACOSTE FOR BEAUTY&YOUTH ONE-TONE SHORT SLEEVE T SHIRT"}
              </h1>
              <button
                type="button"
                aria-label={isSaved ? "取消收藏" : "加入收藏"}
                onClick={handleToggleWishlist}
                disabled={wishlistPending}
                className={`mt-1 shrink-0 transition-colors ${
                  isSaved ? "text-rose-500" : "text-black hover:text-rose-400"
                }`}
              >
                <Heart
                  size={22}
                  strokeWidth={1.5}
                  fill={isSaved ? "currentColor" : "none"}
                />
              </button>
            </div>

            {/* Price */}
            <div className="mb-6 flex items-center gap-3">
              {hasDiscount && (
                <span className="text-[18px] font-bold text-black line-through opacity-50">
                  NT$ {product.regularPrice.toLocaleString()}
                </span>
              )}
              <span
                className={`text-[20px] font-bold ${
                  hasDiscount ? "text-[#c90000]" : "text-black"
                }`}
              >
                NT$ {displayPrice.toLocaleString()}
              </span>
            </div>

            {/* Color selector */}
            <div className="mb-5">
              <p className="mb-2 text-[14px] text-black">
                {selectedColor}
              </p>
              <div className="flex gap-3">
                {COLORS.map((c) => (
                  <button
                    key={c.label}
                    type="button"
                    aria-label={c.label}
                    onClick={() => setSelectedColor(c.label)}
                    className={`relative h-[35px] w-[35px] border-2 transition-all ${
                      selectedColor === c.label
                        ? "border-black scale-110"
                        : "border-transparent hover:border-[#999]"
                    } ${c.label === "白" ? "border border-[#ccc]" : ""}`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            </div>

            {/* Size selector */}
            <div className="mb-4">
              <div className="flex gap-3 flex-wrap">
                {SIZES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSelectedSize(s)}
                    className={`flex h-[39px] w-[55px] items-center justify-center border text-[16px] font-bold transition-colors ${
                      selectedSize === s
                        ? "border-black bg-black text-white"
                        : "border-black bg-transparent text-black hover:bg-black/5"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {!selectedSize && (
                <p className="mt-2 text-[12px] text-[#c90000]">請選擇尺寸</p>
              )}
            </div>

            {/* UNISEX tag */}
            <p className="mb-5 text-[15px] text-[#2a514d]">UNISEX(男女皆適穿)</p>

            {/* Quantity */}
            <div className="mb-4">
              <div className="flex h-[39px] w-[160px] items-center border border-black">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="flex h-full w-[39px] items-center justify-center text-black hover:bg-black/5 transition-colors"
                >
                  <Minus size={14} />
                </button>
                <span className="flex-1 text-center text-[15px] font-medium text-black">
                  {qty}
                </span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  className="flex h-full w-[39px] items-center justify-center text-black hover:bg-black/5 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            {/* Add to cart */}
            <button
              type="button"
              onClick={handleAddToCart}
              disabled={!selectedSize}
              className={`mb-8 flex h-[39px] w-full items-center justify-center text-[15px] text-white transition-all ${
                selectedSize
                  ? "bg-[#2a514d] hover:bg-[#1e3d3a] cursor-pointer"
                  : "cursor-not-allowed bg-[#2a514d]/50"
              } ${adding ? "scale-95" : ""}`}
            >
              {adding ? "已加入購物車 ✓" : "加入購物車"}
            </button>

            {/* ── Accordions ─────────────────────────────────────── */}

            {/* 商品詳情 */}
            <Accordion title="商品詳情" defaultOpen>
              <div className="space-y-3 text-[14px] leading-[20px] tracking-[2.1px] text-black">
                {cleanDescription.split("\n").map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </Accordion>

            {/* 洗滌方式 */}
            <Accordion title="洗滌方式">
              <div className="space-y-2 text-[14px] leading-[20px] tracking-[2.1px] text-black">
                <p>・建議手洗或機洗冷水輕柔模式</p>
                <p>・請勿使用漂白劑</p>
                <p>・請勿烘乾</p>
                <p>・可低溫熨燙（最高 110°C）</p>
                <p>・洗滌前請將衣物翻面</p>
              </div>
            </Accordion>

            {/* 尺寸指南 */}
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
                  <br />
                  標件基準: xxx公分/尺寸 M
                </p>

                {/* T-shirt diagram SVG */}
                <div className="mt-4 flex justify-center">
                  <svg viewBox="0 0 200 220" className="h-[180px] w-auto" fill="none" stroke="#333" strokeWidth="1.5">
                    {/* Body */}
                    <path d="M60 40 L20 80 L40 90 L40 190 L160 190 L160 90 L180 80 L140 40" />
                    {/* Left sleeve */}
                    <path d="M60 40 L20 80 L40 90 L60 60 Z" />
                    {/* Right sleeve */}
                    <path d="M140 40 L180 80 L160 90 L140 60 Z" />
                    {/* Neck */}
                    <path d="M60 40 Q100 20 140 40" />
                    {/* Shoulder labels */}
                    <line x1="60" y1="35" x2="140" y2="35" strokeDasharray="3,2" />
                    <text x="100" y="30" textAnchor="middle" fontSize="9" fill="#555" stroke="none">肩寬</text>
                    {/* Chest labels */}
                    <line x1="40" y1="100" x2="160" y2="100" strokeDasharray="3,2" />
                    <text x="170" y="104" fontSize="9" fill="#555" stroke="none">胸寬</text>
                    {/* Length labels */}
                    <line x1="170" y1="40" x2="170" y2="190" strokeDasharray="3,2" />
                    <text x="178" y="120" fontSize="9" fill="#555" stroke="none" style={{ writingMode: "vertical-rl" }}>衣長</text>
                    {/* Sleeve length */}
                    <line x1="60" y1="38" x2="20" y2="78" strokeDasharray="3,2" />
                    <text x="25" y="55" fontSize="9" fill="#555" stroke="none">袖長</text>
                  </svg>
                </div>
              </div>
            </Accordion>

            {/* FAQs */}
            {faqs.length > 0 && (
              <>
                {faqs.map((faq) => (
                  <Accordion key={faq.question} title={faq.question}>
                    <p className="text-[14px] leading-relaxed text-[#555]">
                      {faq.answer}
                    </p>
                  </Accordion>
                ))}
              </>
            )}

            {/* Breadcrumb */}
            <nav className="mt-8 flex items-center gap-1 text-[11px] text-[#888]">
              <Link href="/" className="hover:text-black">HOME</Link>
              <span>&gt;</span>
              <Link href="/products" className="hover:text-black">ALL ITEMS</Link>
              <span>&gt;</span>
              <span className="text-black line-clamp-1">{product.name}</span>
            </nav>
          </div>
      </div>
    </div>
  );
}
