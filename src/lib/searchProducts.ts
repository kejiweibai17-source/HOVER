import { MOCK_PRODUCTS } from "@/lib/mockProducts";

export type SearchProductResult = {
  id: number | string;
  slug: string;
  name: string;
  price: string;
  image?: string;
};

export function searchMockProducts(
  query: string,
  limit = 10,
): SearchProductResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return MOCK_PRODUCTS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.slug.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q),
  )
    .slice(0, limit)
    .map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: p.price,
      image: p.images?.[0]?.src,
    }));
}

export function formatSearchPrice(price: string | number) {
  const n = Number(String(price).replace(/[^\d.]/g, ""));
  if (!Number.isFinite(n) || n <= 0) return "NT —";
  return `NT ${Math.round(n).toLocaleString("zh-TW")}`;
}
