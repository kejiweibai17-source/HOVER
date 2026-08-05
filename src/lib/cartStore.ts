// lib/cartStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  clampAddQty,
  getMaxOrderQty,
  stockFromCartFields,
  STOCK_INSUFFICIENT_MSG,
  STOCK_SOLD_OUT_MSG,
} from "@/lib/productStock";
import { useToastStore } from "@/lib/toastStore";

export type CartItem = {
  id: string;
  name: string;
  price: number; // 單價（數字）
  qty: number; // 數量
  image?: string;
  slug?: string;
  wcProductId?: number;
  wcVariationId?: number;
  onSale?: boolean;
  regularPrice?: number;
  options?: Record<string, string>;
  /** Woo 庫存快照（加入購物車時寫入） */
  manageStock?: boolean;
  stockQuantity?: number | null;
  stockStatus?: string;
  backorders?: string;
  /** null = 不限量；數字 = 上限 */
  maxQty?: number | null;
};

export type AddItemResult = {
  ok: boolean;
  qty: number;
  message?: string;
};

type CartState = {
  open: boolean;
  items: CartItem[];
  openCart: () => void;
  closeCart: () => void;
  toggle: () => void;
  addItem: (item: CartItem) => AddItemResult;
  removeItem: (keyOrId: string) => void;
  updateQty: (id: string, qty: number) => AddItemResult;
  inc: (key: string) => AddItemResult;
  dec: (key: string) => void;
  clearCart: () => void;
  syncStock: (
    keyOrId: string,
    stock: {
      manageStock?: boolean;
      stockQuantity?: number | null;
      stockStatus?: string;
      backorders?: string;
      maxQty?: number | null;
    },
  ) => void;
};

const makeKey = (i: Pick<CartItem, "id" | "options">) =>
  `${i.id}__${JSON.stringify(i.options || {})}`;

function resolveMax(item: CartItem): number | null {
  if (item.maxQty !== undefined) return item.maxQty;
  return getMaxOrderQty(stockFromCartFields(item));
}

function withStockSnapshot(item: CartItem): CartItem {
  const stock = stockFromCartFields(item);
  const maxQty =
    item.maxQty !== undefined
      ? item.maxQty
      : stock
        ? getMaxOrderQty(stock)
        : undefined;
  return {
    ...item,
    maxQty,
    manageStock: item.manageStock ?? stock?.manageStock,
    stockQuantity:
      item.stockQuantity !== undefined
        ? item.stockQuantity
        : (stock?.stockQuantity ?? undefined),
    stockStatus: item.stockStatus ?? stock?.stockStatus,
    backorders: item.backorders ?? stock?.backorders,
  };
}

function toastStock(message: string) {
  try {
    useToastStore.getState().show(message);
  } catch {
    // ignore
  }
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      open: false,
      items: [],

      openCart: () => set({ open: true }),
      closeCart: () => set({ open: false }),
      toggle: () => set((s) => ({ open: !s.open })),

      addItem: (raw) => {
        const item = withStockSnapshot(raw);
        const key = makeKey(item);
        const next = get().items.slice();
        const idx = next.findIndex((x) => makeKey(x) === key);
        const already = idx >= 0 ? next[idx].qty : 0;
        const stock = stockFromCartFields(item);
        const { qty, limited, remaining } = clampAddQty(
          item.qty,
          stock,
          already,
        );

        if (remaining <= 0 || qty <= 0) {
          toastStock(STOCK_SOLD_OUT_MSG);
          return { ok: false, qty: 0, message: STOCK_SOLD_OUT_MSG };
        }

        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            ...item,
            qty: already + qty,
          };
        } else {
          next.push({ ...item, qty });
        }

        if (limited) {
          toastStock(STOCK_INSUFFICIENT_MSG);
        }

        set({ items: next, open: true });
        return {
          ok: true,
          qty,
          message: limited ? STOCK_INSUFFICIENT_MSG : undefined,
        };
      },

      removeItem: (keyOrId) =>
        set((s) => ({
          items: s.items.filter((x) => {
            const currentKey = makeKey(x);
            if (keyOrId.includes("__")) return currentKey !== keyOrId;
            return x.id !== keyOrId;
          }),
        })),

      updateQty: (id, newQty) => {
        let result: AddItemResult = { ok: true, qty: Math.max(1, newQty) };
        set((s) => ({
          items: s.items.map((x) => {
            if (x.id !== id) return x;
            const max = resolveMax(x);
            const want = Math.max(1, Math.floor(Number(newQty) || 1));
            if (max != null && want > max) {
              toastStock(STOCK_INSUFFICIENT_MSG);
              result = {
                ok: false,
                qty: max,
                message: STOCK_INSUFFICIENT_MSG,
              };
              return { ...x, qty: Math.max(1, max) };
            }
            result = { ok: true, qty: want };
            return { ...x, qty: want };
          }),
        }));
        return result;
      },

      inc: (key) => {
        let result: AddItemResult = { ok: true, qty: 0 };
        set((s) => ({
          items: s.items.map((x) => {
            if (makeKey(x) !== key) return x;
            const max = resolveMax(x);
            const nextQty = x.qty + 1;
            if (max != null && nextQty > max) {
              toastStock(STOCK_INSUFFICIENT_MSG);
              result = {
                ok: false,
                qty: x.qty,
                message: STOCK_INSUFFICIENT_MSG,
              };
              return x;
            }
            result = { ok: true, qty: nextQty };
            return { ...x, qty: nextQty };
          }),
        }));
        return result;
      },

      dec: (key) =>
        set((s) => ({
          items: s.items.map((x) =>
            makeKey(x) === key ? { ...x, qty: Math.max(1, x.qty - 1) } : x,
          ),
        })),

      clearCart: () => set({ items: [] }),

      syncStock: (keyOrId, stock) =>
        set((s) => ({
          items: s.items.map((x) => {
            const match =
              makeKey(x) === keyOrId ||
              x.id === keyOrId ||
              String(x.wcProductId) === keyOrId;
            if (!match) return x;
            const next = withStockSnapshot({ ...x, ...stock });
            const max = resolveMax(next);
            const qty =
              max != null ? Math.min(Math.max(1, x.qty), Math.max(1, max)) : x.qty;
            // max=0 → keep qty 1 but item shouldn't be purchasable; clamp to 1 min for display
            return {
              ...next,
              qty: max === 0 ? x.qty : qty,
            };
          }),
        })),
    }),
    { name: "cart-v1" },
  ),
);

export const selectSubtotal = (s: CartState) =>
  s.items.reduce((sum, it) => sum + it.price * it.qty, 0);

export const selectItems = (s: CartState) => s.items;
export const selectOpen = (s: CartState) => s.open;
export const keyOf = (i: CartItem) => makeKey(i);
