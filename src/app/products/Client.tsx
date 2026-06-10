"use client";

import { useState, useMemo, useCallback } from "react";
import Image from "next/image";
import { Link } from "next-view-transitions";
import { useRouter } from "next/navigation";
import {
  SlidersHorizontal,
  ChevronDown,
  X,
  Heart,
  ChevronRight,
} from "lucide-react";
import { useWishlistStore } from "@/lib/wishlistStore";
import { useAuthStore } from "@/lib/authStore";
import { MOCK_PRODUCTS } from "@/lib/mockProducts";
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
  尺寸: ["S", "M", "L", "XL", "2XL"],
};

const COLOR_SWATCHES: Record<string, string> = {
  黑: "#1a1a1a",
  白: "#f0f0f0",
  綠: "#4a7c59",
  藍: "#4a6fa5",
  粉: "#e8a5a5",
  紅: "#c0392b",
};

const SORT_OPTIONS = ["最新上架", "人氣排序", "價格: 低至高", "價格: 高至低"];
const ITEMS_PER_PAGE = 16;
const FILTER_SIDEBAR_WIDTH = 300;

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
  return (
    <>
      {/* Overlay — covers navbar + page */}
      {open && (
        <div className="fixed inset-0 z-[1100] bg-black/40" onClick={onClose} />
      )}

      {/* Sidebar panel */}
      <aside
        data-lenis-prevent
        style={{ width: FILTER_SIDEBAR_WIDTH }}
        className={`fixed left-0 top-0 z-[1200] h-full overflow-y-auto bg-hover-bg pt-[var(--hover-header-height,116px)] pb-8 px-8 transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 text-[13px] font-medium hover:opacity-60"
          >
            <X size={14} />
            Filter
          </button>
        </div>

        {/* 商品類型 */}
        <div className="mb-6">
          <p className="mb-3 text-[12px] font-semibold tracking-widest text-[#333]">
            商品類型
          </p>
          {Object.entries(
            FILTER_CATEGORIES["商品類型"] as Record<string, string[]>,
          ).map(([group, items]) => (
            <div key={group} className="mb-4">
              <p className="mb-2 text-[12px] text-[#666]">{group}</p>
              <div className="space-y-2">
                {items.map((item) => (
                  <label
                    key={item}
                    className="flex cursor-pointer items-center gap-2"
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border text-white transition-colors ${
                        selected.has(item)
                          ? "border-[#2a514d] bg-[#2a514d]"
                          : "border-[#ccc] bg-white"
                      }`}
                      onClick={() => onToggle(item)}
                    >
                      {selected.has(item) && (
                        <svg
                          viewBox="0 0 10 8"
                          className="h-2.5 w-2.5 fill-white"
                        >
                          <path
                            d="M1 4l3 3 5-5"
                            stroke="white"
                            strokeWidth="1.5"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="text-[12px] text-[#333]">{item}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 顏色 */}
        <div className="mb-6">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[12px] font-semibold tracking-widest text-[#333]">
              顏色
            </p>
            <span className="text-[11px] text-[#999]">+</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {(FILTER_CATEGORIES["顏色"] as string[]).map((color) => (
              <label
                key={color}
                className="flex cursor-pointer flex-col items-center gap-1"
              >
                <span
                  className={`h-6 w-6 rounded-sm border-2 transition-all ${
                    selected.has(color)
                      ? "border-[#2a514d] scale-110"
                      : "border-transparent"
                  }`}
                  style={{ backgroundColor: COLOR_SWATCHES[color] }}
                  onClick={() => onToggle(color)}
                />
                <span className="text-[10px] text-[#555]">{color}</span>
              </label>
            ))}
          </div>
        </div>

        {/* 尺寸 */}
        <div>
          <p className="mb-3 text-[12px] font-semibold tracking-widest text-[#333]">
            尺寸
          </p>
          <div className="flex flex-wrap gap-2">
            {(FILTER_CATEGORIES["尺寸"] as string[]).map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => onToggle(size)}
                className={`h-8 min-w-[40px] rounded border px-2 text-[12px] transition-colors ${
                  selected.has(size)
                    ? "border-[#2a514d] bg-[#2a514d] text-white"
                    : "border-[#ccc] bg-white text-[#333] hover:border-[#999]"
                }`}
              >
                {size}
              </button>
            ))}
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
      className={`absolute right-2 top-2 rounded-full p-1.5 backdrop-blur-sm transition-all ${
        isSaved
          ? "text-rose-500 bg-white/80"
          : "text-[#555] bg-white/60 hover:text-rose-400 hover:bg-white/80"
      }`}
    >
      <Heart
        size={15}
        strokeWidth={1.5}
        fill={isSaved ? "currentColor" : "none"}
      />
    </button>
  );
}

function ProductCard({ product }: { product: Product }) {
  const img = product.images?.[0]?.src || "/images/hover/product-1.jpg";
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      {/* Image container */}
      <div
        className="relative mb-2 w-full overflow-hidden bg-[#eeecea]"
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

        {/* Heart wishlist toggle */}
        <WishlistHeart product={product} />
      </div>

      {/* Info */}
      <div className="px-0.5">
        <p className="mb-0.5 text-[10px] text-[#888]">
          {product.category || "Products"}
        </p>
        <p className="mb-1 text-[12px] font-semibold uppercase leading-snug text-black line-clamp-2">
          {product.name}
        </p>

        {/* Color swatches */}
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

        <p className="text-[12px] text-black">NT {product.price}$</p>
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

export default function Client({ items }: { items: Product[] }) {
  const products: Product[] =
    items?.length > 0 ? items : MOCK_PRODUCTS;

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

  return (
    <div className="bg-hover-bg pb-[100px] pt-10 text-black">
      {/* Filter sidebar drawer */}
      <FilterSidebar
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        selected={selectedFilters}
        onToggle={toggleFilter}
      />

      {/* Page content (shifts right when filter open on desktop) */}
      <div
        className={`transition-all duration-300 ${
          filterOpen ? "md:pl-[300px]" : ""
        }`}
      >
        {/* Page title */}
        <div className="py-10 text-center">
          <h1 className="text-[22px] font-semibold tracking-[0.3em] uppercase">
            全部商品種類
          </h1>
        </div>

        <div className="mx-auto max-w-[1200px] px-4 md:px-8">
          {/* Breadcrumb */}
          <nav className="mb-4 flex items-center gap-1 text-[11px] text-[#888]">
            <Link href="/" className="hover:text-black">
              HOME
            </Link>
            <span>&gt;</span>
            <span className="text-black">ALL ITEMS</span>
          </nav>

          {/* Filter & Sort bar */}
          <div className="mb-8 flex items-center justify-between border-b border-[#e8e8e8] pb-4">
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

          {/* Product grid */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 md:grid-cols-4 md:gap-x-5 md:gap-y-10">
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
