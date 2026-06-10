// lib/wishlistStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type WishlistItem = {
  id: string | number;
  slug: string;
  name: string;
  price: string;
  image?: string;
};

type WishlistState = {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => void;
  removeItem: (id: string | number) => void;
  toggleItem: (item: WishlistItem) => void;
  hasItem: (id: string | number) => boolean;
  clearWishlist: () => void;
};

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        if (get().items.find((x) => x.id === item.id)) return;
        set((s) => ({ items: [...s.items, item] }));
      },

      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((x) => x.id !== id) })),

      toggleItem: (item) => {
        if (get().items.find((x) => x.id === item.id)) {
          set((s) => ({ items: s.items.filter((x) => x.id !== item.id) }));
        } else {
          set((s) => ({ items: [...s.items, item] }));
        }
      },

      hasItem: (id) => !!get().items.find((x) => x.id === id),

      clearWishlist: () => set({ items: [] }),
    }),
    { name: "hover-wishlist-v1" }
  )
);
