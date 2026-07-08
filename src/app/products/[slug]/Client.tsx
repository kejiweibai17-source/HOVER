// app/products/[slug]/Client.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import WishlistIcon from "@/components/hover/WishlistIcon";
import SizeGuideTable from "@/components/hover/SizeGuideTable";
import WashingInstructionsList from "@/components/hover/WashingInstructionsList";
import { useCartStore } from "@/lib/cartStore";
import { useWishlistStore } from "@/lib/wishlistStore";
import { useAuthStore } from "@/lib/authStore";
import {
  isSizeGuideVisible,
  type SizeGuide,
} from "@/lib/sizeGuide";
import {
  DEFAULT_PRODUCT_COLORS,
  type ProductColor,
} from "@/lib/productColors";
import {
  resolveGalleryForColor,
  type ColorGalleries,
} from "@/lib/variationGallery";
import {
  isWashingInstructionsVisible,
  type WashingInstructions,
} from "@/lib/washingInstructions";
import {
  findMatchingVariation,
  getSizesForColor,
  type ProductVariation,
} from "@/lib/productVariations";

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
    sizeGuide?: SizeGuide;
    washingInstructions?: WashingInstructions;
    colors?: ProductColor[];
    sizes?: string[];
    colorGalleries?: ColorGalleries;
    variations?: ProductVariation[];
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
  "/images/hover/people-2.jpg",
];

const GALLERY_IMAGE_COUNT = 8;

function normalizeGalleryImages(images: string[]): string[] {
  const source = images.length > 0 ? images : MOCK_GALLERY;
  return Array.from(
    { length: GALLERY_IMAGE_COUNT },
    (_, i) => source[i % source.length],
  );
}

const DEFAULT_SIZES = ["S", "M", "L", "XL"];
const MOBILE_DEFAULT_SIZES = ["S", "M", "L", "XL", "2XL"];

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
  const gallery = useMemo(() => normalizeGalleryImages(images), [images]);
  const [index, setIndex] = useState(0);
  const secondLarge = gallery[1];
  const gridImages = gallery.slice(2, GALLERY_IMAGE_COUNT);
  const total = gallery.length;
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
              key={gallery[index]}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="absolute inset-0"
            >
              <Image
                src={gallery[index]}
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

      {showRest && secondLarge && (
        <div
          className="relative w-full overflow-hidden bg-[#e8e6e2]"
          style={{ aspectRatio: "3/4" }}
        >
          <Image
            src={secondLarge}
            alt={`${name} 2`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      )}

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
                alt={`${name} ${i + 3}`}
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
  colors,
  sizes,
  qty,
  setQty,
  displayPrice,
  regularPrice,
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
  setSelectedSize: (v: string | null) => void;
  colors: ProductColor[];
  sizes: string[];
  qty: number;
  setQty: React.Dispatch<React.SetStateAction<number>>;
  displayPrice: number;
  regularPrice: number;
  hasDiscount: boolean;
  adding: boolean;
  onAddToCart: () => void;
  isMobile?: boolean;
}) {
  const sizeOptions = sizes.length
    ? sizes
    : isMobile
      ? MOBILE_DEFAULT_SIZES
      : DEFAULT_SIZES;

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
          <WishlistIcon active={isSaved} size={isMobile ? 28 : 24} />
        </button>
      </div>

      <div className={`flex flex-wrap items-baseline gap-2 ${isMobile ? "mb-6" : "mb-8 gap-3"}`}>
        {hasDiscount && (
          <span
            className={`text-black line-through opacity-45 ${
              isMobile ? "text-[14px]" : "text-[16px] md:text-[18px]"
            }`}
          >
            NT. {regularPrice.toLocaleString()}
          </span>
        )}
        <span
          className={`font-bold ${
            isMobile ? "text-[16px]" : "text-[18px] md:text-[20px]"
          } ${hasDiscount ? "text-[#c90000]" : "text-black"}`}
        >
          NT. {displayPrice.toLocaleString()}
        </span>
      </div>

      {colors.length > 0 && (
        <div className={isMobile ? "mb-6" : "mb-8"}>
          <p className="mb-3 text-[13px] tracking-[0.06em] text-black">
            COLOR{isMobile ? "：" : " : "}
            {selectedColor}
          </p>
          <div className="flex flex-wrap gap-3">
            {colors.map((c) => {
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
      )}

      <div className={isMobile ? "mb-4" : "mb-3"}>
        {sizeOptions.length > 0 && (
          <p className="mb-3 text-[13px] tracking-[0.06em] text-black">
            SIZE{isMobile ? "：" : " : "}
            {selectedSize || "請選擇"}
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          {sizeOptions.map((s) => {
            const active = selectedSize === s;
            const isLongLabel = s.length > 2;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSelectedSize(s)}
                className={`flex h-9 items-center justify-center border text-[13px] font-bold transition-all md:h-[35px] ${
                  isLongLabel
                    ? "min-w-[72px] px-3"
                    : "h-9 w-9 md:h-[35px] md:w-[35px]"
                } ${
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
        UNISEX(男女皆適穿)
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
  sizeGuide,
  washingInstructions,
  isMobile = false,
}: {
  cleanDescription: string;
  sizeGuide?: SizeGuide;
  washingInstructions?: WashingInstructions;
  isMobile?: boolean;
}) {
  return (
    <div className={isMobile ? "border-b border-[#d8d8d8]" : undefined}>
      <Accordion title="商品詳情" defaultOpen>
        <div className="space-y-3 text-[14px] leading-[1.7] tracking-[0.06em] text-black">
          {cleanDescription ? (
            cleanDescription.split("\n").map((line, i) => <p key={i}>{line}</p>)
          ) : (
            <p className="text-[#888]">尚無商品說明，請於 WooCommerce 商品「描述」欄位填寫。</p>
          )}
        </div>
      </Accordion>

      {washingInstructions && isWashingInstructionsVisible(washingInstructions) && (
        <Accordion title="洗滌方式">
          <WashingInstructionsList guide={washingInstructions} />
        </Accordion>
      )}

      {sizeGuide && isSizeGuideVisible(sizeGuide) && (
        <Accordion title="尺寸指南">
          <SizeGuideTable guide={sizeGuide} />
          <div className="relative mt-4 aspect-[4/3] w-full overflow-hidden">
            <Image
              src="/images/量測.png"
              alt="尺寸量測方式說明"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-contain"
            />
          </div>
        </Accordion>
      )}
    </div>
  );
}

export default function ProductClient({ product }: ProductProps) {
  const router = useRouter();
  const params = useParams();
  const productSlug = typeof params.slug === "string" ? params.slug : "";
  const addItem = useCartStore((s) => s.addItem);
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const hasItem = useWishlistStore((s) => s.hasItem);
  const checkAuth = useAuthStore((s) => s.checkAuth);

  const productId = Number(product.id) || product.id;
  const isSaved = hasItem(productId);

  const baseGallery =
    product.images && product.images.length > 0 ? product.images : MOCK_GALLERY;
  const colorGalleries = product.colorGalleries || {};

  const colors = product.colors?.length ? product.colors : DEFAULT_PRODUCT_COLORS;
  const sizes = product.sizes?.length ? product.sizes : DEFAULT_SIZES;
  const variations = product.variations || [];

  const [selectedColor, setSelectedColor] = useState(colors[0]?.label || "");
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [wishlistPending, setWishlistPending] = useState(false);
  const [adding, setAdding] = useState(false);

  const availableSizes = useMemo(
    () => getSizesForColor(variations, selectedColor, sizes),
    [variations, selectedColor, sizes],
  );

  useEffect(() => {
    setSelectedSize((prev) => {
      if (availableSizes.length === 1) return availableSizes[0];
      if (prev && availableSizes.includes(prev)) return prev;
      return null;
    });
  }, [availableSizes, selectedColor]);

  const matchedVariation = useMemo(
    () =>
      findMatchingVariation(
        variations,
        selectedColor,
        selectedSize || "",
      ),
    [variations, selectedColor, selectedSize],
  );

  const gallery = useMemo(
    () => resolveGalleryForColor(selectedColor, colorGalleries, baseGallery),
    [selectedColor, colorGalleries, baseGallery],
  );

  const displayPrice = matchedVariation
    ? matchedVariation.salePrice ?? matchedVariation.price
    : product.salePrice ?? product.price;
  const regularPrice = matchedVariation
    ? matchedVariation.regularPrice
    : product.regularPrice;
  const hasDiscount = matchedVariation
    ? matchedVariation.salePrice !== null &&
      matchedVariation.regularPrice > matchedVariation.salePrice
    : product.salePrice !== null && product.regularPrice > product.salePrice;

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
      price: String(displayPrice),
      image: gallery[0],
    });
  };

  const handleAddToCart = () => {
    if (!selectedSize) return;
    setAdding(true);
    addItem({
      id: `${product.id}-${selectedColor}-${selectedSize}`,
      wcProductId: Number(product.id),
      wcVariationId: matchedVariation?.id,
      name: product.name,
      price: displayPrice,
      regularPrice: hasDiscount ? regularPrice : undefined,
      onSale: hasDiscount,
      qty,
      image: gallery[0] || "",
      slug: productSlug,
      options: { 顏色: selectedColor, 尺寸: selectedSize },
    });
    setTimeout(() => setAdding(false), 1000);
  };

  const cleanDescription = product.description
    ? product.description.replace(/<[^>]+>/g, "").trim()
    : product.shortDescription?.replace(/<[^>]+>/g, "").trim() || "";

  const sizeGuide = product.sizeGuide;
  const washingInstructions = product.washingInstructions;

  return (
    <div className="bg-hover-bg">
      {/* 桌機 — 雙欄 */}
      <div className="mx-auto hidden max-w-[1400px] grid-cols-2 items-start gap-12 px-10 pb-16 pt-6 md:grid lg:gap-20 xl:gap-24">
        <div className="w-full">
          <ProductGallery key={selectedColor} images={gallery} name={product.name} />
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
            colors={colors}
            sizes={availableSizes}
            qty={qty}
            setQty={setQty}
            displayPrice={displayPrice}
            regularPrice={regularPrice}
            hasDiscount={hasDiscount}
            adding={adding}
            onAddToCart={handleAddToCart}
          />
          <ProductDetailAccordions
            cleanDescription={cleanDescription}
            sizeGuide={sizeGuide}
            washingInstructions={washingInstructions}
          />
        </div>
      </div>

      {/* 手機 — 主圖 → 購買資訊 → 手風琴 → 下方圖片區 */}
      <div className="bg-white pb-16 md:hidden">
        <ProductGallery key={`${selectedColor}-hero`} images={gallery} name={product.name} part="hero" />

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
            colors={colors}
            sizes={availableSizes}
            qty={qty}
            setQty={setQty}
            displayPrice={displayPrice}
            regularPrice={regularPrice}
            hasDiscount={hasDiscount}
            adding={adding}
            onAddToCart={handleAddToCart}
            isMobile
          />
        </div>

        <div className="mt-6 px-5">
          <ProductDetailAccordions
            cleanDescription={cleanDescription}
            sizeGuide={sizeGuide}
            washingInstructions={washingInstructions}
            isMobile
          />
        </div>

        <div className="mt-6 px-5">
          <ProductGallery
            key={`${selectedColor}-rest`}
            images={gallery}
            name={product.name}
            part="rest"
          />
        </div>
      </div>
    </div>
  );
}
