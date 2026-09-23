export type PromotionType = "gift" | "addon";

export type PromotionProduct = {
  productId: number;
  variationId: number;
  name: string;
  sku: string;
  image: string;
  regularPrice: number;
  stockStatus: string;
  manageStock: boolean;
  stockQuantity: number | null;
  backorders: string;
  colorLabel: string;
  sizeLabel: string;
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
  randomColor: boolean;
  rewardIds: number[];
  inStock: boolean;
  product: PromotionProduct;
  pool: PromotionProduct[];
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

function normalizeProduct(raw: unknown): PromotionProduct | null {
  if (!raw || typeof raw !== "object") return null;
  const product = raw as Record<string, any>;
  const productId = asInt(product.productId);
  if (!productId) return null;
  return {
    productId,
    variationId: asInt(product.variationId),
    name: String(product.name || "活動商品"),
    sku: String(product.sku || ""),
    image: String(product.image || ""),
    regularPrice: asInt(product.regularPrice),
    stockStatus: String(product.stockStatus || ""),
    manageStock: Boolean(product.manageStock),
    stockQuantity:
      product.stockQuantity === null || product.stockQuantity === undefined
        ? null
        : asInt(product.stockQuantity),
    backorders: String(product.backorders || "no"),
    colorLabel: String(product.colorLabel || "").trim(),
    sizeLabel: String(product.sizeLabel || "").trim(),
  };
}

function poolItemInStock(product: PromotionProduct): boolean {
  return (
    product.stockStatus !== "outofstock" &&
    (!product.manageStock ||
      product.stockQuantity === null ||
      product.stockQuantity > 0 ||
      product.backorders !== "no")
  );
}

function normalizeRule(raw: unknown): PromotionRule | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, any>;
  const product = normalizeProduct(row.product);
  const id = String(row.id || "").trim();
  if (!id || !product) return null;

  const type: PromotionType = row.type === "addon" ? "addon" : "gift";
  const randomColor = type === "gift" && Boolean(row.randomColor);
  const pool = (Array.isArray(row.pool) ? row.pool : [])
    .map(normalizeProduct)
    .filter(Boolean) as PromotionProduct[];
  const rewardIds = intList(row.rewardIds);
  const effectivePool =
    randomColor || type === "addon"
      ? pool.length
        ? pool
        : [product]
      : [];
  const inStock =
    effectivePool.length > 0
      ? effectivePool.some(poolItemInStock) || Boolean(row.inStock)
      : Boolean(row.inStock);

  return {
    id,
    type,
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
    randomColor,
    rewardIds: randomColor || type === "addon" ? rewardIds : [],
    inStock,
    product,
    pool: effectivePool,
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

export function promotionPool(promotion: PromotionRule): PromotionProduct[] {
  if (promotion.pool?.length) return promotion.pool;
  return promotion.product ? [promotion.product] : [];
}

/** HOVER SKU 系列：HV26-C01-001-WH-F → HV26-C01-001 */
function promotionSkuSeries(sku: string): string {
  const parts = String(sku || "")
    .trim()
    .toUpperCase()
    .split(/[-_]/)
    .filter(Boolean);
  if (parts.length >= 4) return parts.slice(0, -2).join("-");
  if (parts.length >= 3) return parts.slice(0, -1).join("-");
  return parts.join("-");
}

/** 取商品家族鍵，避免加價購規格池混入不同商品。 */
export function promotionProductFamilyKey(
  product?: PromotionProduct | null,
): string {
  if (!product) return "";
  // 優先 SKU 系列（HOVER 每色各自為可變商品，parent/productId 不同）
  const series = promotionSkuSeries(product.sku || "");
  if (series) return `sku:${series}`;

  const name = String(product.name || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  // 「經典緹花中筒襪 - F, 白」或變體名僅「F, 白」時退回完整名
  const match = name.match(/^(.*?)[\s]*[-–—|:｜].+$/);
  if (match?.[1]?.trim() && match[1].trim().length > 1) {
    return `name:${match[1].trim()}`;
  }
  // 變體顯示名常是「F, 白」— 無法當家族；改用較短共通前綴不可靠，留給 sku
  if (name && !/^[a-z0-9]\s*[,，]/.test(name) && name.length > 2) {
    // 去掉尾端顏色詞後比對
    const stripped = name
      .replace(
        /[\s]*[-–—|:｜,][\s]*(?:色|黑|白|灰|米|棕|藍|綠|紅|粉|卡其|杏|駝).*$/,
        "",
      )
      .trim();
    if (stripped && stripped !== name) return `name:${stripped}`;
    return `name:${name}`;
  }
  if (product.productId) return `id:${product.productId}`;
  return "";
}

/** 加價購僅保留與第一個規格同家族的選項。 */
export function promotionChoicePool(
  promotion: PromotionRule,
): PromotionProduct[] {
  const pool = promotionPool(promotion);
  if (promotion.type !== "addon" || pool.length <= 1) return pool;
  const family = promotionProductFamilyKey(pool[0]);
  const filtered = pool.filter(
    (item) => promotionProductFamilyKey(item) === family,
  );
  return filtered.length ? filtered : pool;
}

export function isPoolVariantInStock(
  variant: PromotionProduct,
  cartItems: PromotionCartItem[] = [],
  needQty = 1,
): boolean {
  const need = Math.max(1, Math.round(Number(needQty) || 1));
  const reserved = reservedQtyForSku(
    cartItems,
    variant.productId,
    variant.variationId,
  );
  const free = poolVariantAvailableQty(variant, reserved);
  return free === null || free >= need;
}

export function findPromotionVariant(
  promotion: PromotionRule,
  productId?: number,
  variationId?: number,
): PromotionProduct | null {
  const pool = promotionPool(promotion);
  const pid = asInt(productId);
  const vid = asInt(variationId);
  if (pid || vid) {
    const matched = pool.find(
      (item) =>
        asInt(item.productId) === pid && asInt(item.variationId) === vid,
    );
    if (matched) return matched;
  }
  return pool.find((item) => poolItemInStock(item)) || pool[0] || null;
}

function reservedQtyForSku(
  items: PromotionCartItem[],
  productId: number,
  variationId: number,
): number {
  return items.reduce((sum, item) => {
    const sameProduct =
      asInt(item.wcProductId || item.id) === productId;
    const sameVariation =
      asInt(item.wcVariationId) === asInt(variationId);
    return sameProduct && sameVariation
      ? sum + Math.max(0, Math.round(Number(item.qty) || 0))
      : sum;
  }, 0);
}

function poolVariantAvailableQty(
  variant: PromotionProduct,
  reserved: number,
): number | null {
  if (!poolItemInStock(variant)) return 0;
  if (
    !variant.manageStock ||
    variant.stockQuantity === null ||
    variant.backorders !== "no"
  ) {
    return null; // unlimited
  }
  return Math.max(0, Number(variant.stockQuantity) - reserved);
}

/** 隨機出貨：從仍有庫存的規格池挑選一個變體。 */
export function pickRandomGiftVariation(
  promotion: PromotionRule,
  cartItems: PromotionCartItem[] = [],
  needQty = 1,
): PromotionProduct | null {
  const need = Math.max(1, Math.round(Number(needQty) || 1));
  const pool = promotionPool(promotion);

  const available = pool.filter((variant) =>
    isPoolVariantInStock(variant, cartItems, need),
  );

  if (!available.length) return null;
  return available[Math.floor(Math.random() * available.length)] || null;
}

/** 前台庫存阻擋訊息；空字串代表目前可領／可加購。 */
export function promotionStockBlockMessage(
  promotion: PromotionRule,
  items: PromotionCartItem[] = [],
  selectedVariant?: PromotionProduct | null,
): string {
  if (!promotion.inStock) return "";
  const need =
    promotion.type === "gift" ? Number(promotion.rewardQty) || 1 : 1;

  if (promotion.randomColor && promotion.pool.length) {
    const canFulfill = promotion.pool.some((variant) =>
      isPoolVariantInStock(variant, items, need),
    );
    if (canFulfill) return "";
    return "隨機贈品規格庫存不足，無法再領取";
  }

  if (promotion.type === "addon" && promotion.pool.length) {
    const target =
      selectedVariant ||
      promotion.pool.find((variant) =>
        isPoolVariantInStock(variant, items, need),
      );
    if (!target) return "加價購規格目前皆無庫存";
    if (!isPoolVariantInStock(target, items, need)) {
      return "所選規格庫存不足，請改選其他規格";
    }
    return "";
  }

  const product = selectedVariant || promotion.product;
  if (!product.manageStock || product.stockQuantity == null) return "";
  const stockQty = Number(product.stockQuantity);
  if (!Number.isFinite(stockQty)) return "";
  const reserved = reservedQtyForSku(
    items,
    product.productId,
    product.variationId,
  );
  if (reserved + need <= stockQty) return "";
  if (reserved > 0) {
    return `購物車已有 ${reserved} 件，庫存只剩 ${stockQty}，無法再當贈品／加價購`;
  }
  return `庫存只剩 ${stockQty}，無法再加 ${need} 件`;
}
