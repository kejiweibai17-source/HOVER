export type PromotionType = "gift" | "addon";

export type PromotionProduct = {
  productId: number;
  variationId: number;
  name: string;
  image: string;
  regularPrice: number;
  stockStatus: string;
  manageStock: boolean;
  stockQuantity: number | null;
  backorders: string;
};

export type PromotionRule = {
  id: string;
  type: PromotionType;
  name: string;
  threshold: number;
  includeProductIds: number[];
  excludeProductIds: number[];
  includeCategoryIds: number[];
  excludeCategoryIds: number[];
  rewardQty: number;
  purchasePrice: number;
  limitQty: number;
  stackable: boolean;
  stockBehavior: "hide" | "disable";
  inStock: boolean;
  product: PromotionProduct;
};

export type PromotionCartItem = {
  wcProductId?: number;
  wcVariationId?: number;
  id?: string | number;
  price: number;
  qty: number;
};

export type EvaluatedPromotion = PromotionRule & {
  eligible: boolean;
  qualifyingSubtotal: number;
  remaining: number;
};

const asInt = (value: unknown, fallback = 0) => {
  const number = Math.round(Number(value));
  return Number.isFinite(number) ? Math.max(0, number) : fallback;
};

const intList = (value: unknown): number[] =>
  Array.isArray(value)
    ? Array.from(new Set(value.map((item) => asInt(item)).filter(Boolean)))
    : [];

function normalizeRule(raw: unknown): PromotionRule | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, any>;
  const product = row.product as Record<string, any> | undefined;
  const id = String(row.id || "").trim();
  const productId = asInt(product?.productId);
  if (!id || !productId) return null;

  return {
    id,
    type: row.type === "addon" ? "addon" : "gift",
    name: String(row.name || "").trim() || "HOVER 優惠活動",
    threshold: asInt(row.threshold),
    includeProductIds: intList(row.includeProductIds),
    excludeProductIds: intList(row.excludeProductIds),
    includeCategoryIds: intList(row.includeCategoryIds),
    excludeCategoryIds: intList(row.excludeCategoryIds),
    rewardQty: Math.max(1, asInt(row.rewardQty, 1)),
    purchasePrice: asInt(row.purchasePrice),
    limitQty: Math.max(1, asInt(row.limitQty, 1)),
    stackable: Boolean(row.stackable),
    stockBehavior: row.stockBehavior === "hide" ? "hide" : "disable",
    inStock: Boolean(row.inStock),
    product: {
      productId,
      variationId: asInt(product?.variationId),
      name: String(product?.name || "活動商品"),
      image: String(product?.image || ""),
      regularPrice: asInt(product?.regularPrice),
      stockStatus: String(product?.stockStatus || ""),
      manageStock: Boolean(product?.manageStock),
      stockQuantity:
        product?.stockQuantity === null || product?.stockQuantity === undefined
          ? null
          : asInt(product.stockQuantity),
      backorders: String(product?.backorders || "no"),
    },
  };
}

export async function fetchPromotionRules(options?: {
  cache?: RequestCache;
}): Promise<PromotionRule[]> {
  const base = (
    process.env.WC_API_BASE ||
    process.env.WORDPRESS_API_URL ||
    ""
  ).replace(/\/$/, "");
  if (!base) return [];

  try {
    const noStore = options?.cache === "no-store";
    const response = await fetch(`${base}/wp-json/hover/v1/promotions`, {
      cache: noStore ? "no-store" : undefined,
      next: noStore ? undefined : { revalidate: 60 },
    });
    if (!response.ok) return [];
    const json = await response.json();
    const rows = Array.isArray(json?.promotions) ? json.promotions : [];
    return rows.map(normalizeRule).filter(Boolean) as PromotionRule[];
  } catch {
    return [];
  }
}

type PromotionProductFact = {
  categories: number[];
  unitPrice: number;
};

async function fetchProductFacts(
  base: string,
  auth: string,
  items: PromotionCartItem[],
): Promise<Map<string, PromotionProductFact>> {
  const result = new Map<string, PromotionProductFact>();
  const uniqueItems = Array.from(
    new Map(
      items.map((item) => {
        const productId = asInt(item.wcProductId || item.id);
        const variationId = asInt(item.wcVariationId);
        return [`${productId}:${variationId}`, { productId, variationId }];
      }),
    ).values(),
  ).filter((item) => item.productId > 0);

  await Promise.all(
    uniqueItems.map(async ({ productId, variationId }) => {
      const key = `${productId}:${variationId}`;
      try {
        const productResponse = await fetch(
          `${base.replace(/\/$/, "")}/wp-json/wc/v3/products/${productId}`,
          { headers: { Authorization: auth }, cache: "no-store" },
        );
        if (!productResponse.ok) return;
        const product = await productResponse.json();
        const categories = Array.isArray(product?.categories)
          ? product.categories
              .map((category: any) => asInt(category?.id))
              .filter(Boolean)
          : [];
        let priceSource = product;
        if (variationId) {
          const variationResponse = await fetch(
            `${base.replace(/\/$/, "")}/wp-json/wc/v3/products/${productId}/variations/${variationId}`,
            { headers: { Authorization: auth }, cache: "no-store" },
          );
          if (!variationResponse.ok) return;
          priceSource = await variationResponse.json();
        }
        const unitPrice = Number(priceSource?.price);
        if (!Number.isFinite(unitPrice) || unitPrice < 0) return;
        result.set(key, { categories, unitPrice });
      } catch {
        // 無法取得 WooCommerce 權威資料時不計入活動門檻。
      }
    }),
  );
  return result;
}

export async function evaluatePromotions(
  items: PromotionCartItem[],
  auth: string,
  options?: { cache?: RequestCache },
): Promise<EvaluatedPromotion[]> {
  const rules = await fetchPromotionRules(options);
  if (!rules.length) return [];
  const base = process.env.WC_API_BASE || process.env.WORDPRESS_API_URL || "";
  const factMap =
    base && auth
      ? await fetchProductFacts(base, auth, items)
      : new Map<string, PromotionProductFact>();

  return rules.map((rule) => {
    const qualifyingSubtotal = items.reduce((sum, item) => {
      const productId = asInt(item.wcProductId || item.id);
      const variationId = asInt(item.wcVariationId);
      const fact = factMap.get(`${productId}:${variationId}`);
      if (!fact) return sum;
      const ids = [productId, variationId].filter(Boolean);
      const categories = fact.categories;
      const excluded =
        ids.some((id) => rule.excludeProductIds.includes(id)) ||
        categories.some((id) => rule.excludeCategoryIds.includes(id));
      if (excluded) return sum;

      const hasIncludes =
        rule.includeProductIds.length > 0 ||
        rule.includeCategoryIds.length > 0;
      const included =
        !hasIncludes ||
        ids.some((id) => rule.includeProductIds.includes(id)) ||
        categories.some((id) => rule.includeCategoryIds.includes(id));
      if (!included) return sum;

      return (
        sum +
        fact.unitPrice *
          Math.max(0, Math.round(Number(item.qty) || 0))
      );
    }, 0);
    const remaining = Math.max(0, rule.threshold - qualifyingSubtotal);
    return {
      ...rule,
      qualifyingSubtotal,
      remaining,
      eligible: remaining === 0 && rule.inStock,
    };
  });
}

export function promotionLinePrice(promotion: PromotionRule): number {
  return promotion.type === "addon" ? promotion.purchasePrice : 0;
}
