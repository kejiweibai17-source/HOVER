/** 結帳草稿（選店返回／重新整理用）sessionStorage keys */
export const CHECKOUT_SESSION_KEYS = [
  "checkout_contact",
  "checkout_addr",
  "checkout_shipMethod",
  "checkout_payMethod",
  "checkout_step",
  "checkout_items",
  "cart_items",
] as const;

/** 下單成功後清空結帳草稿，避免回購物車還留著舊收件／付款資料 */
export function clearCheckoutSession(): void {
  if (typeof window === "undefined") return;
  for (const key of CHECKOUT_SESSION_KEYS) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}
