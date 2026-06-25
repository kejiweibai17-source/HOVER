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

function normalizeCategorySlug(slug: string): string {
  try {
    return decodeURIComponent(slug).toLowerCase();
  } catch {
    return slug.toLowerCase();
  }
}

export function isCategoryVisible(cat: WooCategoryRaw): boolean {
  const slug = normalizeCategorySlug(cat.slug);
  if (HIDDEN_SLUGS.has(slug)) return false;
  if (cat.name === "未分類") return false;
  return cat.hover_show_frontend !== false;
}

export function slugToNavLabel(slug: string): string {
  return slug.toUpperCase();
}

export function buildCategoryNav(categories: WooCategoryRaw[]): NavCategory[] {
  const visible = categories.filter(isCategoryVisible);

  const parents = visible
    .filter((c) => c.parent === 0)
    .sort((a, b) => {
      const orderDiff = (a.menu_order ?? 0) - (b.menu_order ?? 0);
      if (orderDiff !== 0) return orderDiff;
      return a.name.localeCompare(b.name, "zh-Hant");
    });

  return parents.map((parent) => {
    const children = visible
      .filter((c) => c.parent === parent.id)
      .sort((a, b) => {
        const orderDiff = (a.menu_order ?? 0) - (b.menu_order ?? 0);
        if (orderDiff !== 0) return orderDiff;
        return a.name.localeCompare(b.name, "zh-Hant");
      })
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
