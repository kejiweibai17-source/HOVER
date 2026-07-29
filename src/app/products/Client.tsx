"use client";

import { useState, useMemo, useCallback, useRef, memo } from "react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, ChevronDown, X, ChevronRight } from "lucide-react";
import WishlistIcon from "@/components/hover/WishlistIcon";
import HoverLogo from "@/components/hover/HoverLogo";
import HoverIcon from "@/components/hover/HoverIcon";
import CartIcon from "@/components/hover/CartIcon";
import OptimizedImage from "@/components/hover/OptimizedImage";
import { useWishlistStore } from "@/lib/wishlistStore";
import { useAuthStore } from "@/lib/authStore";
import { useSearchStore } from "@/lib/searchStore";
import { useCartStore } from "@/lib/cartStore";
import { MOCK_PRODUCTS } from "@/lib/mockProducts";
import { guessColorHex } from "@/lib/productColors";
import CategoryBannerBlock from "@/components/hover/CategoryBannerBlock";
import type { CategoryBanner } from "@/lib/categoryBannerDefaults";
/* ─── Types ─────────────────────────────────────────────────────────────── */

export type Product = {
  id: number;
  slug: string;
  name: string;
  price: string;
  images: { src: string; alt?: string }[];
  category?: string;
  isNew?: boolean;
  tag?: string;
  colors?: string[];
  categories?: string[];
  colorLabels?: string[];
  sizes?: string[];
};

/* ─── Filter config ─────────────────────────────────────────────────────── */

const FILTER_CATEGORIES: Record<string, Record<string, string[]> | string[]> = {
  商品類型: {
    上身服飾: ["短袖上衣", "長袖上衣", "罩衣", "帽T"],
    帽子: ["老帽", "漁夫帽", "毛帽"],
    褲子: ["中間褲", "短褲"],
    包袋: ["托特包", "帆布袋", "側背包"],
  } as Record<string, string[]>,
  顏色: ["黑", "白", "綠", "藍", "粉", "紅"],
  尺寸: ["S", "M", "L", "XL"],
};

const SORT_OPTIONS = ["最新上架", "人氣排序", "價格: 低至高", "價格: 高至低"];
const ITEMS_PER_PAGE = 16;

/* ─── Filter matching ───────────────────────────────────────────────────── */

const TYPE_FILTER_VALUES = new Set(
  Object.values(FILTER_CATEGORIES["商品類型"] as Record<string, string[]>).flat(),
);
const COLOR_FILTER_VALUES = new Set(FILTER_CATEGORIES["顏色"] as string[]);
const SIZE_FILTER_VALUES = new Set(FILTER_CATEGORIES["尺寸"] as string[]);

/** 模糊比對：任一字串包含目標（如「黑色」符合「黑」）。 */
function fuzzyIncludes(values: string[], target: string): boolean {
  const t = target.trim().toLowerCase();
  return values.some((v) => {
    const s = String(v || "").trim().toLowerCase();
    return s === t || s.includes(t) || t.includes(s);
  });
}

function matchesFilters(product: Product, selected: Set<string>): boolean {
  if (selected.size === 0) return true;

  const types: string[] = [];
  const colors: string[] = [];
  const sizes: string[] = [];
  selected.forEach((val) => {
    if (TYPE_FILTER_VALUES.has(val)) types.push(val);
    else if (COLOR_FILTER_VALUES.has(val)) colors.push(val);
    else if (SIZE_FILTER_VALUES.has(val)) sizes.push(val);
  });

  // 各維度之間為 AND，同維度內為 OR
  if (types.length > 0) {
    const productTypes = [
      ...(product.categories || []),
      ...(product.category ? [product.category] : []),
      product.name || "",
    ];
    if (!types.some((t) => fuzzyIncludes(productTypes, t))) return false;
  }

  if (colors.length > 0) {
    const labels = product.colorLabels || [];
    if (!colors.some((c) => fuzzyIncludes(labels, c))) return false;
  }

  if (sizes.length > 0) {
    const productSizes = (product.sizes || []).map((s) => s.toUpperCase());
    if (!sizes.some((s) => productSizes.includes(s.toUpperCase()))) return false;
  }

  return true;
}

/* ─── Sub-components ────────────────────────────────────────────────────── */

function FilterSidebar({
  open,
  onClose,
  onApply,
  selected,
  onToggle,
}: {
  open: boolean;
  onClose: () => void;
  onApply: () => void;
  selected: Set<string>;
  onToggle: (val: string) => void;
}) {
  const openSearch = useSearchStore((s) => s.openSearch);
  const cartItems = useCartStore((s) => s.items);
  const cartCount = cartItems.reduce((t, i) => t + (i.qty || 0), 0);

  return (
    <>
      {/* Overlay — 桌機點擊外側關閉 */}
      {open && (
        <div
          className="fixed inset-0 z-[1150] hidden bg-black/20 md:block"
          onClick={onClose}
        />
      )}

      <aside
        data-lenis-prevent
        className={`fixed bottom-0 left-0 top-0 z-[1200] flex h-full w-full flex-col overflow-y-auto bg-white transition-transform duration-300 md:w-[340px] ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top bar — X / Logo / 搜尋 + 購物車（手機才顯示） */}
        <div className="relative flex shrink-0 items-center justify-between border-b border-[#ececec] px-4 py-3 md:hidden">
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉篩選"
            className="flex h-9 w-9 items-center justify-center text-black hover:opacity-60"
          >
            <X size={20} strokeWidth={1.5} />
          </button>

          <Link
            href="/"
            aria-label="HOVER"
            onClick={onClose}
            className="absolute left-1/2 -translate-x-1/2 text-black"
          >
            <HoverLogo aria-hidden className="h-7 w-auto" />
          </Link>

          <div className="-mr-0.5 flex items-center justify-end gap-0">
            <button
              type="button"
              aria-label="搜尋"
              className="flex h-8 w-8 shrink-0 items-center justify-center text-black"
              onClick={() => {
                onClose();
                openSearch();
              }}
            >
              <HoverIcon name="search" size={28} alt="搜尋" />
            </button>
            <Link
              href="/cart"
              aria-label={
                cartCount > 0 ? `購物車，${cartCount} 件商品` : "購物車"
              }
              className="relative flex h-8 w-8 shrink-0 items-center justify-center text-black"
              onClick={onClose}
            >
              <CartIcon count={cartCount} size={30} />
            </Link>
          </div>
        </div>

        <div className="flex-1 px-6 pb-10 pt-6 md:pt-20  ">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-[15px] font-medium tracking-[0.08em] text-black">
              Filter
            </p>
            {/* 桌機關閉鈕 */}
            <button
              type="button"
              onClick={onClose}
              aria-label="關閉篩選"
              className="hidden items-center gap-1.5 text-[13px] text-black hover:opacity-60 md:flex"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>

          {/* 商品類型 */}
          <div className="mb-8">
            <p className="mb-3 text-[13px] font-semibold tracking-widest text-[#333]">
              商品類型
            </p>
            {Object.entries(
              FILTER_CATEGORIES["商品類型"] as Record<string, string[]>,
            ).map(([group, items]) => (
              <div key={group} className="mb-4">
                <p className="mb-2 text-[12px] text-[#999]">{group}</p>
                <div className="space-y-2.5">
                  {items.map((item) => (
                    <label
                      key={item}
                      className="flex cursor-pointer items-center gap-2.5"
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 rounded-sm border-2 transition-colors ${
                          selected.has(item)
                            ? "border-[#2a514d] bg-[#2a514d]"
                            : "border-[#ccc] bg-white"
                        }`}
                        onClick={() => onToggle(item)}
                      />
                      <span className="text-[13px] text-[#333]">{item}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 顏色 */}
          <div className="mb-8">
            <p className="mb-3 text-[13px] font-semibold tracking-widest text-[#333]">
              顏色
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              {(FILTER_CATEGORIES["顏色"] as string[]).map((color) => {
                const active = selected.has(color);
                return (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    onClick={() => onToggle(color)}
                    className="flex items-center gap-2 hover:opacity-70"
                  >
                    <span
                      className={`h-[22px] w-[22px] border transition-all ${
                        active
                          ? "border-black ring-1 ring-black ring-offset-1"
                          : "border-[#ccc]"
                      }`}
                      style={{ backgroundColor: guessColorHex(color) }}
                    />
                    <span className="text-[12px] text-[#333]">{color}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 尺寸 */}
          <div>
            <p className="mb-3 text-[13px] font-semibold tracking-widest text-[#333]">
              尺寸
            </p>
            <div className="flex flex-wrap gap-2.5">
              {(FILTER_CATEGORIES["尺寸"] as string[]).map((size) => {
                const active = selected.has(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => onToggle(size)}
                    className={`flex h-[30px] min-w-[30px] items-center justify-center border px-2 text-[12px] font-bold transition-all ${
                      active
                        ? "border-[#8b8b8b] bg-[#8b8b8b] text-white"
                        : "border-[#ccc] bg-white text-black hover:border-[#888]"
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 底部固定：套用篩選 */}
        <div className="sticky bottom-0 shrink-0 border-t border-[#ececec] bg-white px-6 py-4">
          <button
            type="button"
            onClick={onApply}
            className="flex h-11 w-full items-center justify-center bg-[#2a514d] text-[14px] font-bold tracking-[0.12em] text-white transition-opacity hover:opacity-90"
          >
            篩選{selected.size > 0 ? `（${selected.size}）` : ""}
          </button>
        </div>
      </aside>
    </>
  );
}

function SortDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-[13px] text-black hover:opacity-60"
      >
        排序
        <ChevronDown
          size={14}
          className={`transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <ul className="absolute right-0 top-7 z-20 min-w-[140px] rounded border border-[#e0e0e0] bg-white py-1 shadow-lg">
            {SORT_OPTIONS.map((opt) => (
              <li key={opt}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                  className={`w-full px-4 py-2 text-left text-[12px] hover:bg-[#f5f5f3] ${
                    value === opt
                      ? "font-semibold text-[#2a514d]"
                      : "text-[#333]"
                  }`}
                >
                  {opt}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function WishlistHeart({ product }: { product: Product }) {
  const router = useRouter();
  const toggleItem = useWishlistStore((s) => s.toggleItem);
  const hasItem = useWishlistStore((s) => s.hasItem);
  const checkAuth = useAuthStore((s) => s.checkAuth);
  const isSaved = hasItem(product.id);
  const [pending, setPending] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;
    setPending(true);
    const loggedIn = await checkAuth();
    setPending(false);
    if (!loggedIn) {
      router.push(`/login?next=${encodeURIComponent("/products")}`);
      return;
    }
    toggleItem({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      image: product.images?.[0]?.src,
    });
  };

  return (
    <button
      type="button"
      aria-label={isSaved ? "取消收藏" : "加入收藏"}
      onClick={handleClick}
      disabled={pending}
      className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-visible transition-opacity hover:opacity-60 ${
        isSaved ? "opacity-100" : "opacity-80"
      }`}
    >
      <WishlistIcon active={isSaved} size={20} />
    </button>
  );
}

function ProductCardImage({
  fullSrc,
  alt,
  priority = false,
  className = "",
}: {
  fullSrc: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <OptimizedImage
      src={fullSrc}
      fullSrc={fullSrc}
      role="card"
      alt={alt}
      fill
      sizes="(max-width: 768px) 50vw, 25vw"
      priority={priority}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`object-cover ${className}`}
    />
  );
}

const ProductCard = memo(function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const img = product.images?.[0]?.src || "/images/hover/product-1.jpg";
  const hoverImage = product.images
    ?.slice(1)
    .find((image) => image?.src && image.src !== img);
  const hoverImg = hoverImage?.src;
  const hasHoverImage = Boolean(hoverImg);
  // 等滑過才掛第二張圖，避免一進頁就解碼 32 張原圖
  const [hoverReady, setHoverReady] = useState(false);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block"
      onMouseEnter={() => {
        if (hasHoverImage) setHoverReady(true);
      }}
      onFocus={() => {
        if (hasHoverImage) setHoverReady(true);
      }}
    >
      {/* Image container */}
      <div
        className="relative mb-2 w-full overflow-hidden bg-white"
        style={{ aspectRatio: "1/1" }}
      >
        <ProductCardImage
          fullSrc={img}
          alt={product.images?.[0]?.alt || product.name}
          priority={priority}
          className={
            hasHoverImage && hoverReady
              ? "transition-opacity duration-300 opacity-100 group-hover:opacity-0"
              : ""
          }
        />
        {hasHoverImage && hoverReady && (
          <ProductCardImage
            fullSrc={hoverImg!}
            alt={hoverImage?.alt || `${product.name} alternate view`}
            className="transition-opacity duration-300 opacity-0 group-hover:opacity-100"
          />
        )}

        {/* Badge */}
        {(product.isNew || product.tag) && (
          <span className="absolute left-2 top-2 text-[10px] font-semibold tracking-widest text-[#333]">
            {product.isNew ? "NEW" : product.tag}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="mt-2 min-w-0 space-y-1 px-0.5 text-left md:mt-3">
        <div className="mb-0 flex min-h-9 min-w-0 items-center justify-between gap-2">
          <p className="flex min-w-0 flex-1 items-center break-words text-[12px] font-semibold leading-snug text-black line-clamp-2 md:text-[13px]">
            {product.name}
          </p>
          <WishlistHeart product={product} />
        </div>

        {product.colors && product.colors.length > 0 && (
          <div className="flex items-center gap-1.5 pt-0.5">
            {product.colors.map((c, i) => (
              <span
                key={i}
                className="inline-block h-3 w-3 shrink-0 rounded-full border border-[#ccc]"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}

        <p className="pt-0.5 text-[12px] font-bold text-[#222] md:text-[13px]">
          NT {product.price}
        </p>
      </div>
    </Link>
  );
});

function Pagination({
  current,
  total,
  onChange,
}: {
  current: number;
  total: number;
  onChange: (p: number) => void;
}) {
  if (total <= 1) return null;

  const pages: (number | "...")[] = [];
  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1, 2, 3, 4);
    if (current > 5) pages.push("...");
    if (current > 4 && current < total - 2) pages.push(current);
    pages.push("...", total);
  }

  return (
    <div className="mt-14 flex items-center justify-center gap-1 text-[13px]">
      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`dots-${i}`} className="px-2 text-[#999]">
            ......
          </span>
        ) : (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p as number)}
            className={`flex h-8 w-8 items-center justify-center rounded transition-colors ${
              p === current
                ? "bg-black text-white"
                : "text-[#333] hover:bg-[#f0f0f0]"
            }`}
          >
            {p}
          </button>
        ),
      )}
      {current < total && (
        <button
          type="button"
          onClick={() => onChange(current + 1)}
          className="ml-2 flex items-center gap-1 text-[13px] text-[#333] hover:opacity-60"
        >
          NEXT <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
}

/* ─── Main Client Component ─────────────────────────────────────────────── */

export default function Client({
  items,
  categoryLabel = "ALL ITEMS",
  categorySlug = "all",
  banner = null,
}: {
  items: Product[];
  categoryLabel?: string;
  categorySlug?: string;
  banner?: CategoryBanner | null;
}) {
  const products: Product[] = items?.length > 0 ? items : MOCK_PRODUCTS;

  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState("最新上架");
  // 已套用的篩選條件（實際過濾列表用）
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(
    new Set(),
  );
  // 側欄內暫存的勾選狀態（按下「篩選」才套用）
  const [draftFilters, setDraftFilters] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);

  const toggleFilter = useCallback((val: string) => {
    setDraftFilters((prev) => {
      const next = new Set(prev);
      next.has(val) ? next.delete(val) : next.add(val);
      return next;
    });
  }, []);

  const openFilter = useCallback(() => {
    setDraftFilters(new Set(selectedFilters));
    setFilterOpen(true);
  }, [selectedFilters]);

  const applyFilters = useCallback(() => {
    setSelectedFilters(new Set(draftFilters));
    setCurrentPage(1);
    setFilterOpen(false);
    setTimeout(() => {
      gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, [draftFilters]);

  const sorted = useMemo(() => {
    const list = products.filter((p) => matchesFilters(p, selectedFilters));
    if (sortBy === "價格: 低至高")
      list.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortBy === "價格: 高至低")
      list.sort((a, b) => Number(b.price) - Number(a.price));
    return list;
  }, [products, sortBy, selectedFilters]);

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = sorted.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const gridRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-white pb-[100px] text-black">
      {/* Filter sidebar drawer */}
      <FilterSidebar
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={applyFilters}
        selected={draftFilters}
        onToggle={toggleFilter}
      />

      {/* Page content */}
      <div>
        {banner ? (
          <>
            {/* 桌機：上方 Banner＋標題＋麵包屑 = 50vh；手機 Banner 16:9 流式 */}
            <div className="md:flex md:h-[50vh] md:min-h-[280px] md:flex-col">
              <CategoryBannerBlock banner={banner} viewportFill />
              <nav className="mb-3 mt-4 flex shrink-0 items-center gap-1 px-4 text-[11px] text-[#888] md:mt-4 md:mb-3 md:px-12 lg:px-16">
                <Link href="/" className="hover:text-black">
                  HOME
                </Link>
                <span>&gt;</span>
                <span className="text-black">{categoryLabel}</span>
              </nav>
            </div>

            {/* 桌機：下方篩選＋產品至少 50vh */}
            <div className="md:flex md:min-h-[50vh] md:flex-col">
              <div className="w-full shrink-0 border-t border-b border-[#e8e8e8]">
                <div className="flex w-full items-center justify-between px-4 pb-4 pt-3 md:px-12 lg:px-16">
                  <button
                    type="button"
                    onClick={() =>
                      filterOpen ? setFilterOpen(false) : openFilter()
                    }
                    className="flex items-center gap-2 text-[13px] text-black hover:opacity-60"
                  >
                    <SlidersHorizontal size={15} strokeWidth={1.5} />
                    Filters
                  </button>
                  <SortDropdown value={sortBy} onChange={setSortBy} />
                </div>
              </div>

              <div className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-6 md:px-8">
                {sorted.length === 0 ? (
                  <div
                    ref={gridRef}
                    className="flex flex-col items-center justify-center gap-3 py-24 text-center"
                  >
                    <p className="text-[15px] font-medium tracking-[0.08em] text-[#333]">
                      查無此結果
                    </p>
                    <p className="text-[13px] text-[#888]">
                      請調整或清除篩選條件後再試一次。
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedFilters(new Set());
                        setDraftFilters(new Set());
                      }}
                      className="mt-2 border border-[#2a514d] px-6 py-2 text-[13px] font-bold tracking-[0.08em] text-[#2a514d] transition-colors hover:bg-[#2a514d] hover:text-white"
                    >
                      清除篩選條件
                    </button>
                  </div>
                ) : (
                  <div
                    ref={gridRef}
                    className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 md:gap-x-5 md:gap-y-10"
                  >
                    {paginated.map((product, index) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        priority={index < 4}
                      />
                    ))}
                  </div>
                )}

                {totalPages > 1 && (
                  <Pagination
                    current={currentPage}
                    total={totalPages}
                    onChange={(p) => {
                      setCurrentPage(p);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  />
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="py-10 pt-20 text-center">
              <h1 className="text-[22px] font-semibold tracking-[0.3em] uppercase">
                {categorySlug === "all" ? "全部商品種類" : categoryLabel}
              </h1>
            </div>
            <nav className="mb-4 mt-6 flex items-center gap-1 px-4 text-[11px] text-[#888] md:mt-8 md:px-12 lg:px-16">
              <Link href="/" className="hover:text-black">
                HOME
              </Link>
              <span>&gt;</span>
              <span className="text-black">{categoryLabel}</span>
            </nav>
            <div className="mb-8 w-full border-t border-b border-[#e8e8e8]">
              <div className="flex w-full items-center justify-between px-4 pb-4 pt-3 md:px-12 lg:px-16">
                <button
                  type="button"
                  onClick={() =>
                    filterOpen ? setFilterOpen(false) : openFilter()
                  }
                  className="flex items-center gap-2 text-[13px] text-black hover:opacity-60"
                >
                  <SlidersHorizontal size={15} strokeWidth={1.5} />
                  Filters
                </button>
                <SortDropdown value={sortBy} onChange={setSortBy} />
              </div>
            </div>

            <div className="mx-auto max-w-[1200px] px-4 md:px-8">
              {sorted.length === 0 ? (
                <div
                  ref={gridRef}
                  className="flex flex-col items-center justify-center gap-3 py-24 text-center"
                >
                  <p className="text-[15px] font-medium tracking-[0.08em] text-[#333]">
                    查無此結果
                  </p>
                  <p className="text-[13px] text-[#888]">
                    請調整或清除篩選條件後再試一次。
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFilters(new Set());
                      setDraftFilters(new Set());
                    }}
                    className="mt-2 border border-[#2a514d] px-6 py-2 text-[13px] font-bold tracking-[0.08em] text-[#2a514d] transition-colors hover:bg-[#2a514d] hover:text-white"
                  >
                    清除篩選條件
                  </button>
                </div>
              ) : (
                <div
                  ref={gridRef}
                  className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 md:gap-x-5 md:gap-y-10"
                >
                  {paginated.map((product, index) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      priority={index < 4}
                    />
                  ))}
                </div>
              )}

              {totalPages > 1 && (
                <Pagination
                  current={currentPage}
                  total={totalPages}
                  onChange={(p) => {
                    setCurrentPage(p);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
