// lib/cartStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  id: string;
  name: string;
  price: number;     // 單價（數字）
  qty: number;       // 數量
  image?: string;
  wcProductId?: number; // 確保前端結帳時能抓到這個 WooCommerce ID
  options?: Record<string, string>; // 例如 { 口味: '奶茶', 規格: '8 份' }
};

type CartState = {
  open: boolean;
  items: CartItem[];
  openCart: () => void;
  closeCart: () => void;
  toggle: () => void;
  addItem: (item: CartItem) => void;
  removeItem: (keyOrId: string) => void;
  updateQty: (id: string, qty: number) => void; // ✅ 支援前端直接修改數量
  inc: (key: string) => void;
  dec: (key: string) => void;
  clearCart: () => void; // ✅ 修正：改名為 clearCart 以對應 CartPage
};

// 產生唯一 Key：以 id + options 序列化，確保同規格被合併
const makeKey = (i: Pick<CartItem, "id" | "options">) =>
  `${i.id}__${JSON.stringify(i.options || {})}`;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      open: false,
      items: [],

      openCart: () => set({ open: true }),
      closeCart: () => set({ open: false }),
      toggle: () => set((s) => ({ open: !s.open })),

      addItem: (item) => {
        const key = makeKey(item);
        const next = get().items.slice();
        // 嘗試找完全一樣規格的商品
        const idx = next.findIndex((x) => makeKey(x) === key);

        if (idx >= 0) {
          next[idx] = { ...next[idx], qty: next[idx].qty + item.qty };
        } else {
          // 如果沒有完全一樣的，就新增
          next.push(item);
        }
        set({ items: next, open: true }); // 加入同時打開側欄
      },

      // ✅ 修正：允許移除特定規格 (Key) 或移除該 ID 的所有商品
      // 這樣 CartDrawer (用 Key) 和 CartPage (可能用 ID) 都能運作
      removeItem: (keyOrId) =>
        set((s) => ({
          items: s.items.filter((x) => {
            const currentKey = makeKey(x);
            // 如果傳入的是複合 Key (包含 __)，就比對 Key
            if (keyOrId.includes("__")) return currentKey !== keyOrId;
            // 如果傳入的是 ID，就刪除該 ID 的所有規格商品
            return x.id !== keyOrId;
          })
        })),

      // ✅ 新增：直接設定數量 (相容前端 CartPage 的 updateQty)
      updateQty: (id, newQty) =>
        set((s) => ({
          items: s.items.map((x) =>
            // 注意：如果該 ID 有多種規格，這裡會同時修改所有該 ID 的數量
            // 若 CartPage 是依 ID 列出商品，這是正確行為
            x.id === id ? { ...x, qty: Math.max(1, newQty) } : x
          ),
        })),

      inc: (key) =>
        set((s) => ({
          items: s.items.map((x) =>
            makeKey(x) === key ? { ...x, qty: x.qty + 1 } : x
          ),
        })),

      dec: (key) =>
        set((s) => ({
          items: s.items
            .map((x) =>
              makeKey(x) === key ? { ...x, qty: Math.max(1, x.qty - 1) } : x
            ),
        })),

      // ✅ 修正：改名為 clearCart
      clearCart: () => set({ items: [] }),
    }),
    { name: "cart-v1" }
  )
);

// Helper Selectors
export const selectSubtotal = (s: CartState) =>
  s.items.reduce((sum, it) => sum + it.price * it.qty, 0);

export const selectItems = (s: CartState) => s.items;
export const selectOpen = (s: CartState) => s.open;
export const keyOf = (i: CartItem) => makeKey(i);