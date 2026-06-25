export type WooCategoryRaw = {
  id: number;
  name: string;
  slug: string;
  parent: number;
  menu_order?: number;
  hover_show_frontend?: boolean;
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

/** WooCommerce 無法讀取時的預設導覽（與首頁分類區一致） */
export const FALLBACK_NAV_CATEGORIES: NavCategory[] = [
  {
    id: -1,
    slug: "tops",
    label: "TOPS",
    href: "/products?category=tops",
    children: [],
  },
  {
    id: -2,
    slug: "bags",
    label: "BAGS",
    href: "/products?category=bags",
    children: [],
  },
  {
    id: -3,
    slug: "others",
    label: "OTHERS",
    href: "/products?category=others",
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

export function isCategoryVisible(cat: WooCategoryRaw): boolean {
  const slug = normalizeCategorySlug(cat.slug);
  if (HIDDEN_SLUGS.has(slug)) return false;
  if (cat.name === "未分類") return false;
  return isTruthyVisibility(cat.hover_show_frontend);
}

export function slugToNavLabel(slug: string): string {
  return slug.toUpperCase();
}

function sortCategories(a: WooCategoryRaw, b: WooCategoryRaw): number {
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

  const parents = visible.filter(isTopLevel).sort(sortCategories);

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
