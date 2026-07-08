"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, ChevronDown, X, ChevronRight } from "lucide-react";
import WishlistIcon from "@/components/hover/WishlistIcon";
import HoverLogo from "@/components/hover/HoverLogo";
import HoverIcon from "@/components/hover/HoverIcon";
import CartIcon from "@/components/hover/CartIcon";
import { useWishlistStore } from "@/lib/wishlistStore";
import { useAuthStore } from "@/lib/authStore";
import { useSearchStore } from "@/lib/searchStore";
import { useCartStore } from "@/lib/cartStore";
import { MOCK_PRODUCTS } from "@/lib/mockProducts";
import { guessColorHex } from "@/lib/productColors";
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

/* ─── Sub-components ────────────────────────────────────────────────────── */

function FilterSidebar({
  open,
  onClose,
  selected,
  onToggle,
}: {
  open: boolean;
  onClose: () => void;
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
                        onClick={() => {
                          onToggle(item);
                          onClose();
                        }}
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
                    onClick={() => {
                      onToggle(color);
                      onClose();
                    }}
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
                    onClick={() => {
                      onToggle(size);
                      onClose();
                    }}
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
      className={`flex h-9 w-9 shrink-0 items-center justify-center transition-opacity hover:opacity-60 ${
        isSaved ? "opacity-100" : "opacity-80"
      }`}
    >
      <WishlistIcon active={isSaved} size={20} />
    </button>
  );
}

function ProductCard({ product }: { product: Product }) {
  const img = product.images?.[0]?.src || "/images/hover/product-1.jpg";
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      {/* Image container */}
      <div
        className="relative mb-2 w-full overflow-hidden bg-white"
        style={{ aspectRatio: "3/4" }}
      >
        <Image
          src={img}
          alt={product.images?.[0]?.alt || product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Badge */}
        {(product.isNew || product.tag) && (
          <span className="absolute left-2 top-2 text-[10px] font-semibold tracking-widest text-[#333]">
            {product.isNew ? "NEW" : product.tag}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="px-0.5">
        <div className="mb-1 flex min-h-9 items-center justify-between gap-2">
          <p className="flex min-w-0 flex-1 items-center text-[12px] font-semibold leading-snug text-black line-clamp-2">
            {product.name}
          </p>
          <WishlistHeart product={product} />
        </div>

        {product.colors && product.colors.length > 0 && (
          <div className="mb-1 flex gap-1">
            {product.colors.map((c, i) => (
              <span
                key={i}
                className="inline-block h-3 w-3 rounded-full border border-[#ddd]"
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        )}

        <p className="text-[12px] text-black">NT {product.price}</p>
      </div>
    </Link>
  );
}

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
}: {
  items: Product[];
  categoryLabel?: string;
}) {
  const products: Product[] = items?.length > 0 ? items : MOCK_PRODUCTS;

  const [filterOpen, setFilterOpen] = useState(false);
  const [sortBy, setSortBy] = useState("最新上架");
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(
    new Set(),
  );
  const [currentPage, setCurrentPage] = useState(1);

  const toggleFilter = useCallback((val: string) => {
    setSelectedFilters((prev) => {
      const next = new Set(prev);
      next.has(val) ? next.delete(val) : next.add(val);
      return next;
    });
    setCurrentPage(1);
    // 立即捲到商品區
    setTimeout(() => {
      gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  const sorted = useMemo(() => {
    const list = [...products];
    if (sortBy === "價格: 低至高")
      list.sort((a, b) => Number(a.price) - Number(b.price));
    else if (sortBy === "價格: 高至低")
      list.sort((a, b) => Number(b.price) - Number(a.price));
    return list;
  }, [products, sortBy]);

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = sorted.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const gridRef = useRef<HTMLDivElement>(null);

  return (
    <div className="bg-white pb-[100px] pt-10 text-black">
      {/* Filter sidebar drawer */}
      <FilterSidebar
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        selected={selectedFilters}
        onToggle={toggleFilter}
      />

      {/* Page content */}
      <div>
        {/* Page title */}
        <div className="py-10 text-center">
          <h1 className="text-[22px] font-semibold tracking-[0.3em] uppercase">
            全部商品種類
          </h1>
        </div>

        {/* Breadcrumb — align left with filter bar */}
        <nav className="mb-4 flex items-center gap-1 px-4 text-[11px] text-[#888] md:px-12 lg:px-16">
          <Link href="/" className="hover:text-black">
            HOME
          </Link>
          <span>&gt;</span>
          <span className="text-black">{categoryLabel}</span>
        </nav>

        {/* Filter & Sort bar — full width, content at both edges */}
        <div className="mb-8 w-full border-t border-b border-[#e8e8e8]">
          <div className="flex w-full items-center justify-between px-4 pb-4 pt-3 md:px-12 lg:px-16">
            <button
              type="button"
              onClick={() => setFilterOpen((o) => !o)}
              className="flex items-center gap-2 text-[13px] text-black hover:opacity-60"
            >
              <SlidersHorizontal size={15} strokeWidth={1.5} />
              Filters
            </button>
            <SortDropdown value={sortBy} onChange={setSortBy} />
          </div>
        </div>

        <div className="mx-auto max-w-[1200px] px-4 md:px-8">
          {/* Product grid */}
          <div
            ref={gridRef}
            className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 md:gap-x-5 md:gap-y-10"
          >
            {paginated.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination */}
          <Pagination
            current={currentPage}
            total={totalPages}
            onChange={(p) => {
              setCurrentPage(p);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </div>
      </div>
    </div>
  );
}
