import { normalizeStorefrontSlug } from "@/lib/productColors";

export type WishlistItemInput = {
  id: string | number;
  slug?: string;
  href?: string;
  name: string;
  price: string | number;
  image?: string | null;
};

/** 從 href／slug 取出可用的商品路徑 slug（不可用數字 ID 冒充） */
export function resolveWishlistSlug(input: {
  slug?: string | null;
  href?: string | null;
  id?: string | number | null;
}): string {
  const fromSlug = normalizeStorefrontSlug(String(input.slug || "").trim());
  if (fromSlug && !/^\d+$/.test(fromSlug)) return fromSlug;

  const href = String(input.href || "").trim();
  const fromHref = normalizeStorefrontSlug(
    href.replace(/^https?:\/\/[^/]+/i, "").replace(/^\/products\//, "").replace(/\/$/, ""),
  );
  if (fromHref && !/^\d+$/.test(fromHref)) return fromHref;

  return "";
}

export function resolveWishlistImage(src?: string | null): string {
  const value = String(src || "").trim();
  if (!value) return "";
  if (
    value.startsWith("/") ||
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }
  return "";
}

export function buildWishlistItem(input: WishlistItemInput) {
  const id = input.id;
  const slug = resolveWishlistSlug(input);
  const image = resolveWishlistImage(input.image);
  return {
    id,
    slug,
    name: String(input.name || "").trim() || "商品",
    price: String(input.price ?? ""),
    image: image || undefined,
  };
}

export function wishlistProductHref(slug: string, id?: string | number): string {
  const clean = resolveWishlistSlug({ slug, id });
  if (clean) return `/products/${clean}`;
  // 沒有 slug 時不要連到錯誤路徑；交由 hydrate 修復
  return id != null && String(id) !== "" ? `/products?id=${encodeURIComponent(String(id))}` : "/products";
}
