// lib/wishlistStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useToastStore } from "@/lib/toastStore";
import {
  buildWishlistItem,
  type WishlistItemInput,
} from "@/lib/wishlistItem";

export type WishlistItem = {
  id: string | number;
  slug: string;
  name: string;
  price: string;
  image?: string;
};

type HydratedRow = {
  id: number | string;
  missing?: boolean;
  slug?: string;
  name?: string;
  price?: string;
  image?: string;
};

type WishlistState = {
  items: WishlistItem[];
  addItem: (item: WishlistItemInput) => void;
  removeItem: (id: string | number) => void;
  toggleItem: (item: WishlistItemInput) => void;
  hasItem: (id: string | number) => boolean;
  clearWishlist: () => void;
  /** 用 Woo 最新資料回填 slug／圖片；下架商品保留列但清掉失效 slug */
  mergeHydrated: (rows: HydratedRow[]) => void;
};

function sameId(a: string | number, b: string | number) {
  return String(a) === String(b);
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (raw) => {
        const item = buildWishlistItem(raw);
        if (get().items.find((x) => sameId(x.id, item.id))) return;
        set((s) => ({ items: [...s.items, item] }));
        useToastStore.getState().show(`已將 ${item.name} 加入收藏`);
      },

      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((x) => !sameId(x.id, id)) })),

      toggleItem: (raw) => {
        const item = buildWishlistItem(raw);
        if (get().items.find((x) => sameId(x.id, item.id))) {
          set((s) => ({ items: s.items.filter((x) => !sameId(x.id, item.id)) }));
        } else {
          set((s) => ({ items: [...s.items, item] }));
          useToastStore.getState().show(`已將 ${item.name} 加入收藏`);
        }
      },

      hasItem: (id) => !!get().items.find((x) => sameId(x.id, id)),

      clearWishlist: () => set({ items: [] }),

      mergeHydrated: (rows) => {
        if (!Array.isArray(rows) || rows.length === 0) return;
        const map = new Map(
          rows.map((row) => [String(row.id), row] as const),
        );
        set((s) => ({
          items: s.items.map((item) => {
            const live = map.get(String(item.id));
            if (!live) return item;
            if (live.missing) {
              return { ...item, slug: "" };
            }
            return {
              ...item,
              slug: String(live.slug || item.slug || "").trim() || item.slug,
              name: String(live.name || item.name || "").trim() || item.name,
              price:
                live.price != null && String(live.price) !== ""
                  ? String(live.price)
                  : item.price,
              image: String(live.image || item.image || "").trim() || item.image,
            };
          }),
        }));
      },
    }),
    { name: "hover-wishlist-v1" },
  ),
);
