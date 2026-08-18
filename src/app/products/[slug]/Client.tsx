// app/products/[slug]/Client.tsx
"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { Minus, Plus } from "lucide-react";
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
import { formatProductPrice, hasRichHtmlContent, sanitizeRichHtml } from "@/lib/utils";
import { type ColorGalleries } from "@/lib/variationGallery";
import {
  isWashingInstructionsVisible,
  type WashingInstructions,
} from "@/lib/washingInstructions";
import {
  findMatchingVariation,
  getSizesForColor,
  resolveInitialColorLabel,
  variationsHaveColorAttribute,
  type ProductDefaultAttributes,
  type ProductVariation,
} from "@/lib/productVariations";
import {
  clampAddQty,
  getMaxOrderQty,
  isInStock,
  STOCK_INSUFFICIENT_MSG,
  STOCK_SOLD_OUT_MSG,
  type ProductStock,
} from "@/lib/productStock";
import { useToastStore } from "@/lib/toastStore";

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
    defaultAttributes?: ProductDefaultAttributes;
    /** 本商品顏色（同款分色獨立商品） */
    productColor?: string;
    stock?: ProductStock;
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
  // 有幾張顯示幾張，不重複補滿；最多取 8 張
  return source.slice(0, GALLERY_IMAGE_COUNT);
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
  variant = "desktop",
}: {
  images: string[];
  name: string;
  part?: "all" | "hero" | "rest";
  variant?: "desktop" | "mobile";
}) {
  const gallery = useMemo(() => normalizeGalleryImages(images), [images]);
  const isMobile = variant === "mobile";
  const visible =
    part === "hero"
      ? gallery.slice(0, 1)
      : part === "rest"
        ? gallery.slice(1, GALLERY_IMAGE_COUNT)
        : gallery.slice(0, GALLERY_IMAGE_COUNT);

  return (
    <div className="flex flex-col gap-2">
      {visible.map((src, i) => (
        <div
          key={`${part}-${src}-${i}`}
          className="relative w-full overflow-hidden bg-[#e8e6e2]"
          style={{ aspectRatio: "3/4" }}
        >
          {isMobile ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={`${name} ${part === "rest" ? i + 2 : i + 1}`}
              className="absolute inset-0 h-full w-full object-contain"
              loading={i === 0 && part === "hero" ? "eager" : "lazy"}
              decoding="async"
            />
          ) : (
            <Image
              src={src}
              alt={`${name} ${part === "rest" ? i + 2 : i + 1}`}
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-contain"
              priority={i === 0 && part !== "rest"}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function ProductPurchasePanel({
  product,
  isSaved,
  wishlistPending,
  onToggleWishlist,
  selectedColor,
  onSelectColor,
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
  maxQty = null,
  sizeStockMap = {},
  soldOut = false,
  isMobile = false,
}: {
  product: ProductProps["product"];
  isSaved: boolean;
  wishlistPending: boolean;
  onToggleWishlist: () => void;
  selectedColor: string;
  onSelectColor: (color: ProductColor) => void;
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
  /** null = 不限量 */
  maxQty?: number | null;
  /** 各尺寸是否有庫存 */
  sizeStockMap?: Record<string, boolean>;
  soldOut?: boolean;
  isMobile?: boolean;
}) {
  const sizeOptions = sizes.length
    ? sizes
    : isMobile
      ? MOBILE_DEFAULT_SIZES
      : DEFAULT_SIZES;

  const canIncrease =
    maxQty === null || maxQty === undefined || qty < maxQty;
  const canAdd = Boolean(selectedSize) && !soldOut;

  return (
    <>
      <div className={`flex items-start justify-between gap-3 ${isMobile ? "mb-4" : "mb-5 gap-4"}`}>
        <h1
          className={`font-semibold uppercase leading-snug tracking-[0.02em] text-black ${
            isMobile ? "text-[16px] leading-[1.45]" : "text-[17px] md:text-[20px]"
          }`}
        >
          {product.name}
        </h1>
        <button
          type="button"
          aria-label={isSaved ? "取消收藏" : "加入收藏"}
          onClick={onToggleWishlist}
          disabled={wishlistPending}
          className={`mt-0.5 shrink-0 transition-opacity hover:opacity-70 ${
            wishlistPending ? "opacity-50" : "opacity-100"
          }`}
        >
          {/* 對齊 Header 收藏／搜尋圖示：桌機 24、手機約 22 */}
          <WishlistIcon active={isSaved} size={isMobile ? 22 : 24} />
        </button>
      </div>

      <div className={`flex flex-wrap items-baseline gap-2 ${isMobile ? "mb-6" : "mb-8 gap-3"}`}>
        {hasDiscount && (
          <span
            className={`text-black line-through opacity-45 ${
              isMobile ? "text-[14px]" : "text-[16px] md:text-[18px]"
            }`}
          >
            {formatProductPrice(regularPrice)}
          </span>
        )}
        <span
          className={`font-semibold ${
            isMobile ? "text-[16px]" : "text-[18px] md:text-[20px]"
          } ${hasDiscount ? "text-[#c90000]" : "text-black"}`}
        >
          {formatProductPrice(displayPrice)}
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
                  key={c.slug || c.label}
                  type="button"
                  aria-label={c.label}
                  onClick={() => onSelectColor(c)}
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
            const sizeSoldOut = sizeStockMap[s] === false;
            return (
              <button
                key={s}
                type="button"
                disabled={sizeSoldOut}
                onClick={() => !sizeSoldOut && setSelectedSize(s)}
                className={`relative flex h-9 items-center justify-center border text-[13px] font-bold transition-all md:h-[35px] ${
                  isLongLabel
                    ? "min-w-[72px] px-3"
                    : "h-9 w-9 md:h-[35px] md:w-[35px]"
                } ${
                  sizeSoldOut
                    ? "cursor-not-allowed border-[#ddd] bg-[#f5f5f5] text-[#aaa] line-through"
                    : active
                      ? "border-[#8b8b8b] bg-[#8b8b8b] text-white"
                      : "border-[#ccc] bg-white text-black hover:border-[#888]"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>
        {soldOut && selectedSize && (
          <p className="mt-2.5 text-[12px] text-[#c90000]">{STOCK_SOLD_OUT_MSG}</p>
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
            disabled={!canIncrease || soldOut}
            onClick={() => {
              if (!canIncrease) {
                useToastStore.getState().show(STOCK_INSUFFICIENT_MSG);
                return;
              }
              setQty((q) => q + 1);
            }}
            className={`flex h-full w-10 items-center justify-center text-black transition-colors ${
              !canIncrease || soldOut
                ? "cursor-not-allowed opacity-40"
                : "hover:bg-black/5"
            }`}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={onAddToCart}
        disabled={!canAdd}
        className={`flex h-10 w-full items-center justify-center text-[15px] text-white transition-all ${
          isMobile ? "mb-0" : "mb-10"
        } ${
          canAdd
            ? "cursor-pointer bg-[#2a514d] hover:bg-[#1e3d3a]"
            : "cursor-not-allowed bg-[#9a9a9a]"
        } ${adding ? "scale-[0.98]" : ""}`}
      >
        {soldOut
          ? "已售完"
          : adding
            ? "已加入購物車 ✓"
            : "加入購物車"}
      </button>
    </>
  );
}

function ProductDetailAccordions({
  descriptionHtml,
  sizeGuide,
  washingInstructions,
  isMobile = false,
}: {
  descriptionHtml: string;
  sizeGuide?: SizeGuide;
  washingInstructions?: WashingInstructions;
  isMobile?: boolean;
}) {
  const hasDescription = hasRichHtmlContent(descriptionHtml);

  return (
    <div className={isMobile ? "border-b border-[#d8d8d8]" : undefined}>
      <Accordion title="商品詳情" defaultOpen>
        {hasDescription ? (
          <div
            className={[
              "product-description text-[14px] leading-[1.7] tracking-[0.06em] text-black",
              "[&_p]:mb-3 [&_p:last-child]:mb-0",
              // 後台連續 Enter 的空白段：保留行高，看起來像空行
              "[&_p:has(>br:only-child)]:mb-0 [&_p:has(>br:only-child)]:min-h-[1.7em]",
              "[&_br]:block",
              "[&_strong]:font-bold [&_b]:font-bold",
              "[&_em]:italic [&_i]:italic",
              "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5",
              "[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1.5 [&_ol]:pl-5",
              "[&_li]:leading-[1.7]",
              "[&_h1]:mb-3 [&_h1]:mt-4 [&_h1]:text-[22px] [&_h1]:font-bold [&_h1]:leading-snug [&_h1]:tracking-[0.04em] [&_h1]:text-[#111]",
              "[&_h2]:mb-3 [&_h2]:mt-4 [&_h2]:text-[18px] [&_h2]:font-bold [&_h2]:leading-snug [&_h2]:tracking-[0.04em] [&_h2]:text-[#111]",
              "[&_h3]:mb-2 [&_h3]:mt-3 [&_h3]:text-[16px] [&_h3]:font-bold [&_h3]:leading-snug [&_h3]:tracking-[0.04em] [&_h3]:text-[#222]",
              "[&_h4]:mb-2 [&_h4]:mt-3 [&_h4]:text-[15px] [&_h4]:font-bold [&_h4]:text-[#222]",
              "[&_h5]:mb-2 [&_h5]:mt-2 [&_h5]:text-[14px] [&_h5]:font-bold [&_h5]:text-[#333]",
              "[&_h6]:mb-2 [&_h6]:mt-2 [&_h6]:text-[13px] [&_h6]:font-bold [&_h6]:text-[#333]",
              "[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-[#ccc] [&_blockquote]:pl-3 [&_blockquote]:text-[#555]",
              "[&_a]:underline [&_a]:underline-offset-2 [&_a]:transition-opacity hover:[&_a]:opacity-70",
              "[&_hr]:my-4 [&_hr]:border-[#e5e5e5]",
            ].join(" ")}
            dangerouslySetInnerHTML={{ __html: descriptionHtml }}
          />
        ) : (
          <p className="text-[14px] text-[#888]">
            尚無商品說明，請於 WooCommerce 商品「描述」欄位填寫。
          </p>
        )}
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
              src={sizeGuide.imageUrl || "/images/量測.png"}
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
  const variations = product.variations || [];
  const defaultAttributes = product.defaultAttributes || {};

  const rawColors = product.colors?.length
    ? product.colors
    : DEFAULT_PRODUCT_COLORS;
  const hasSiblingColorLinks = rawColors.some((c) => Boolean(c.slug));
  const variationHasColor = variationsHaveColorAttribute(variations);

  // 單色獨立商品：若尚未設定同款群組，但屬性仍列多色，只保留本商品顏色，避免同頁假切換
  const colors = useMemo(() => {
    if (hasSiblingColorLinks || variationHasColor) return rawColors;
    if (rawColors.length <= 1) return rawColors;
    const own =
      String(product.productColor || "").trim() ||
      String(defaultAttributes.color || "").trim();
    if (!own) return rawColors.slice(0, 1);
    const matched = rawColors.filter((c) => {
      const a = c.label.trim().toLowerCase();
      const b = own.toLowerCase();
      return a === b || a.includes(b) || b.includes(a);
    });
    return matched.length ? matched : rawColors.slice(0, 1);
  }, [
    rawColors,
    hasSiblingColorLinks,
    variationHasColor,
    product.productColor,
    defaultAttributes.color,
  ]);

  const sizes = product.sizes?.length ? product.sizes : DEFAULT_SIZES;
  const defaultColorLabel = resolveInitialColorLabel(
    colors,
    product.productColor || defaultAttributes.color,
  );
  const defaultSizeLabel = String(defaultAttributes.size || "").trim();

  const [selectedColor, setSelectedColor] = useState(defaultColorLabel);
  const [selectedSize, setSelectedSize] = useState<string | null>(
    defaultSizeLabel || null,
  );
  const [qty, setQty] = useState(1);
  const [wishlistPending, setWishlistPending] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleSelectColor = (color: ProductColor) => {
    if (
      color.slug &&
      productSlug &&
      color.slug !== productSlug
    ) {
      router.push(`/products/${color.slug}`);
      return;
    }
    setSelectedColor(color.label);
  };

  const availableSizes = useMemo(
    () => getSizesForColor(variations, selectedColor, sizes),
    [variations, selectedColor, sizes],
  );

  useEffect(() => {
    setSelectedSize((prev) => {
      if (availableSizes.length === 1) return availableSizes[0];
      if (prev && availableSizes.includes(prev)) return prev;
      if (defaultSizeLabel && availableSizes.includes(defaultSizeLabel)) {
        return defaultSizeLabel;
      }
      return null;
    });
  }, [availableSizes, selectedColor, defaultSizeLabel]);

  const matchedVariation = useMemo(
    () =>
      findMatchingVariation(
        variations,
        selectedColor,
        selectedSize || "",
      ),
    [variations, selectedColor, selectedSize],
  );

  const activeStock: ProductStock | null | undefined = matchedVariation
    ? matchedVariation.stock
    : product.stock;

  const maxQty = getMaxOrderQty(activeStock);
  const soldOut = Boolean(selectedSize) && !isInStock(activeStock);

  const sizeStockMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const size of availableSizes) {
      if (!variations.length) {
        map[size] = isInStock(product.stock);
        continue;
      }
      const v = findMatchingVariation(variations, selectedColor, size);
      map[size] = v ? isInStock(v.stock) : isInStock(product.stock);
    }
    return map;
  }, [availableSizes, variations, selectedColor, product.stock]);

  // 切換規格時把數量壓回庫存上限
  useEffect(() => {
    if (maxQty != null && qty > maxQty) {
      setQty(Math.max(1, maxQty));
    }
  }, [maxQty, qty]);

  const gallery = useMemo(() => {
    if (selectedSize) {
      const fromVariation = (matchedVariation?.gallery || []).filter(Boolean);
      if (fromVariation.length) return fromVariation;
    }
    return baseGallery;
  }, [selectedSize, matchedVariation, baseGallery]);

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
    if (!selectedSize || soldOut) return;
    const cartId = `${product.id}-${selectedColor}-${selectedSize}`;
    const existing = useCartStore
      .getState()
      .items.find((x) => x.id === cartId);
    const already = existing?.qty || 0;
    const { qty: allowed, limited, remaining } = clampAddQty(
      qty,
      activeStock,
      already,
    );
    if (remaining <= 0 || allowed <= 0) {
      useToastStore.getState().show(STOCK_SOLD_OUT_MSG);
      return;
    }
    if (limited) {
      useToastStore.getState().show(STOCK_INSUFFICIENT_MSG);
    }
    setAdding(true);
    addItem({
      id: cartId,
      wcProductId: Number(product.id),
      wcVariationId: matchedVariation?.id,
      name: product.name,
      price: displayPrice,
      regularPrice: hasDiscount ? regularPrice : undefined,
      onSale: hasDiscount,
      qty: allowed,
      image: gallery[0] || "",
      slug: productSlug,
      options: { 顏色: selectedColor, 尺寸: selectedSize },
      manageStock: activeStock?.manageStock,
      stockQuantity: activeStock?.stockQuantity ?? null,
      stockStatus: activeStock?.stockStatus,
      backorders: activeStock?.backorders,
      maxQty,
    });
    setTimeout(() => setAdding(false), 1000);
  };

  const descriptionHtml = sanitizeRichHtml(
    product.description || product.shortDescription || "",
  );

  const sizeGuide = product.sizeGuide;
  const washingInstructions = product.washingInstructions;

  return (
    <div className="bg-hover-bg">
      {/* 桌機 — 雙欄 */}
      <div className="mx-auto hidden max-w-[1400px] grid-cols-2 items-start gap-12 px-10 pb-16 pt-6 md:grid lg:gap-20 xl:gap-24">
        <div className="w-full">
          <ProductGallery key={`${selectedColor}-${selectedSize || "none"}`} images={gallery} name={product.name} />
        </div>

        <div className="w-full md:sticky md:top-[calc(var(--hover-header-height,116px)+16px)] md:self-start">
          <ProductPurchasePanel
            product={product}
            isSaved={isSaved}
            wishlistPending={wishlistPending}
            onToggleWishlist={handleToggleWishlist}
            selectedColor={selectedColor}
            onSelectColor={handleSelectColor}
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
            maxQty={maxQty}
            sizeStockMap={sizeStockMap}
            soldOut={soldOut}
          />
          <ProductDetailAccordions
            descriptionHtml={descriptionHtml}
            sizeGuide={sizeGuide}
            washingInstructions={washingInstructions}
          />
        </div>
      </div>

      {/* 手機 — 主圖 → 購買資訊 → 手風琴 → 下方圖片區 */}
      <div className="bg-white pb-16 md:hidden">
        <ProductGallery
          key={`${selectedColor}-${selectedSize || "none"}-hero`}
          images={gallery}
          name={product.name}
          part="hero"
          variant="mobile"
        />

        <div className="px-5 pt-5">
          <ProductPurchasePanel
            product={product}
            isSaved={isSaved}
            wishlistPending={wishlistPending}
            onToggleWishlist={handleToggleWishlist}
            selectedColor={selectedColor}
            onSelectColor={handleSelectColor}
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
            maxQty={maxQty}
            sizeStockMap={sizeStockMap}
            soldOut={soldOut}
            isMobile
          />
        </div>

        <div className="mt-6 px-5">
          <ProductDetailAccordions
            descriptionHtml={descriptionHtml}
            sizeGuide={sizeGuide}
            washingInstructions={washingInstructions}
            isMobile
          />
        </div>

        <div className="mt-6">
          <ProductGallery
            key={`${selectedColor}-${selectedSize || "none"}-rest`}
            images={gallery}
            name={product.name}
            part="rest"
            variant="mobile"
          />
        </div>
      </div>
    </div>
  );
}
