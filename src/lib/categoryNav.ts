export type WooCategoryRaw = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  menu_order?: number;
  /** Navbar／其他分類導覽是否顯示（預設 true） */
  hover_show_frontend?: boolean;
  /** Filter「商品類型」是否顯示（預設 true） */
  hover_show_filter?: boolean;
};

export type NavCategoryChild = {
  id: number;
  name: string;
  slug: string;
  href: string;
};

export type NavCategory = {
  id: number;
  slug: string;
  label: string;
  href: string;
  children: NavCategoryChild[];
};

const HIDDEN_SLUGS = new Set(["uncategorized", "未分類"]);

/** Navbar 顯示順序（ALL ITEMS 為獨立連結，不在此列） */
const NAV_CATEGORY_ORDER = ["tops", "headwear", "socks", "bags"] as const;

const NAV_MENU_SLUGS = new Set<string>(NAV_CATEGORY_ORDER);

const NAV_LABEL_OVERRIDES: Record<string, string> = {
  tops: "TOP",
  headwear: "HEADWEAR",
  socks: "SOCKS",
  bags: "BAG",
};

/** WooCommerce 無法讀取時的預設導覽 */
export const FALLBACK_NAV_CATEGORIES: NavCategory[] = [
  {
    id: -1,
    slug: "tops",
    label: "TOP",
    href: "/products?category=tops",
    children: [],
  },
  {
    id: -4,
    slug: "headwear",
    label: "HEADWEAR",
    href: "/products?category=headwear",
    children: [],
  },
  {
    id: -5,
    slug: "socks",
    label: "SOCKS",
    href: "/products?category=socks",
    children: [],
  },
  {
    id: -2,
    slug: "bags",
    label: "BAG",
    href: "/products?category=bags",
    children: [],
  },
];

function toNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeCategory(cat: WooCategoryRaw): WooCategoryRaw {
  return {
    ...cat,
    id: toNumber(cat.id),
    parent: toNumber(cat.parent),
    menu_order:
      cat.menu_order === undefined ? undefined : toNumber(cat.menu_order),
  };
}

function normalizeCategorySlug(slug: string): string {
  try {
    return decodeURIComponent(slug).toLowerCase();
  } catch {
    return slug.toLowerCase();
  }
}

function isTruthyVisibility(value: unknown): boolean {
  if (value === false || value === 0 || value === "0") return false;
  if (value === "false" || value === "no") return false;
  return true;
}

function isHiddenSystemCategory(cat: WooCategoryRaw): boolean {
  const slug = normalizeCategorySlug(cat.slug);
  if (HIDDEN_SLUGS.has(slug)) return true;
  if (cat.name === "未分類") return true;
  return false;
}

/** Navbar／其他分類導覽可見性 */
export function isCategoryVisible(cat: WooCategoryRaw): boolean {
  if (isHiddenSystemCategory(cat)) return false;
  return isTruthyVisibility(cat.hover_show_frontend);
}

/** Filter「商品類型」可見性（可與 Navbar 分開） */
export function isCategoryVisibleInFilter(cat: WooCategoryRaw): boolean {
  if (isHiddenSystemCategory(cat)) return false;
  return isTruthyVisibility(cat.hover_show_filter);
}

export function slugToNavLabel(slug: string): string {
  const normalized = normalizeCategorySlug(slug);
  return NAV_LABEL_OVERRIDES[normalized] ?? slug.toUpperCase();
}

function navCategorySortIndex(slug: string): number {
  const normalized = normalizeCategorySlug(slug);
  const idx = NAV_CATEGORY_ORDER.indexOf(
    normalized as (typeof NAV_CATEGORY_ORDER)[number],
  );
  return idx === -1 ? NAV_CATEGORY_ORDER.length + 1 : idx;
}

function sortCategories(a: WooCategoryRaw, b: WooCategoryRaw): number {
  const navOrderDiff = navCategorySortIndex(a.slug) - navCategorySortIndex(b.slug);
  if (navOrderDiff !== 0) return navOrderDiff;
  const orderDiff = (a.menu_order ?? 0) - (b.menu_order ?? 0);
  if (orderDiff !== 0) return orderDiff;
  return a.name.localeCompare(b.name, "zh-Hant");
}

export function buildCategoryNav(categories: WooCategoryRaw[]): NavCategory[] {
  const normalized = categories.map(normalizeCategory);
  const visible = normalized.filter(isCategoryVisible);
  const visibleById = new Map(visible.map((cat) => [cat.id, cat]));

  const isTopLevel = (cat: WooCategoryRaw) => {
    if (cat.parent === 0) return true;
    return !visibleById.has(cat.parent);
  };

  const parents = visible
    .filter(isTopLevel)
    .filter((cat) => NAV_MENU_SLUGS.has(normalizeCategorySlug(cat.slug)))
    .sort(sortCategories);

  return parents.map((parent) => {
    const children = visible
      .filter((c) => c.parent === parent.id)
      .sort(sortCategories)
      .map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        href: `/products?category=${encodeURIComponent(child.slug)}`,
      }));

    return {
      id: parent.id,
      slug: parent.slug,
      label: slugToNavLabel(parent.slug),
      href: `/products?category=${encodeURIComponent(parent.slug)}`,
      children,
    };
  });
}
