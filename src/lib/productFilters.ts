import type { WooCategoryRaw } from "./categoryNav";
import { isCategoryVisibleInFilter } from "./categoryNav";
import { guessColorHex } from "./productColors";
import { sortProductSizes } from "./productVariations";

export type FilterTypeGroup = {
  group: string;
  items: string[];
};

export type FilterColorOption = {
  label: string;
  hex: string;
};

export type ProductFilterOptions = {
  typeGroups: FilterTypeGroup[];
  colors: FilterColorOption[];
  sizes: string[];
};

type ListProductLike = {
  category?: string;
  categories?: string[];
  colors?: string[];
  colorLabels?: string[];
  sizes?: string[];
};

function normalizeCategory(cat: WooCategoryRaw): WooCategoryRaw {
  return {
    ...cat,
    id: Number(cat.id) || 0,
    parent: Number(cat.parent) || 0,
    menu_order:
      cat.menu_order === undefined ? undefined : Number(cat.menu_order),
  };
}

function sortCategories(a: WooCategoryRaw, b: WooCategoryRaw): number {
  const orderDiff = (a.menu_order ?? 0) - (b.menu_order ?? 0);
  if (orderDiff !== 0) return orderDiff;
  return a.name.localeCompare(b.name, "zh-Hant");
}

function collectProductCategoryNames(products: ListProductLike[]): Set<string> {
  const names = new Set<string>();
  for (const product of products) {
    if (product.category?.trim()) names.add(product.category.trim());
    for (const name of product.categories || []) {
      if (name?.trim()) names.add(name.trim());
    }
  }
  return names;
}

/**
 * 商品類型：依 Woo 分類父子結構分組；只顯示「當前商品列表有用到」的分類。
 * 顏色／尺寸：由當前商品變體彙整。
 */
export function buildProductFilterOptions(
  categories: WooCategoryRaw[],
  products: ListProductLike[],
): ProductFilterOptions {
  const productCatNames = collectProductCategoryNames(products);
  const visible = categories
    .map(normalizeCategory)
    .filter(isCategoryVisibleInFilter)
    .sort(sortCategories);
  const visibleById = new Map(visible.map((cat) => [cat.id, cat]));

  const isTopLevel = (cat: WooCategoryRaw) => {
    if (cat.parent === 0) return true;
    return !visibleById.has(cat.parent);
  };

  const parents = visible.filter(isTopLevel);
  const typeGroups: FilterTypeGroup[] = [];

  for (const parent of parents) {
    const children = visible
      .filter((cat) => cat.parent === parent.id)
      .sort(sortCategories);

    let items: string[];
    if (children.length > 0) {
      items = children
        .map((child) => child.name.trim())
        .filter((name) => productCatNames.has(name));
    } else if (productCatNames.has(parent.name.trim())) {
      items = [parent.name.trim()];
    } else {
      items = [];
    }

    if (items.length === 0) continue;
    typeGroups.push({ group: parent.name.trim(), items });
  }

  const colorMap = new Map<string, string>();
  for (const product of products) {
    const labels = product.colorLabels || [];
    const hexes = product.colors || [];
    labels.forEach((label, index) => {
      const key = String(label || "").trim();
      if (!key || colorMap.has(key)) return;
      const hex = String(hexes[index] || "").trim() || guessColorHex(key);
      colorMap.set(key, hex);
    });
  }
  const colors: FilterColorOption[] = Array.from(colorMap.entries())
    .map(([label, hex]) => ({ label, hex }))
    .sort((a, b) => a.label.localeCompare(b.label, "zh-Hant"));

  const sizeSet = new Set<string>();
  for (const product of products) {
    for (const size of product.sizes || []) {
      const key = String(size || "").trim();
      if (key) sizeSet.add(key);
    }
  }
  const sizes = sortProductSizes(Array.from(sizeSet));

  return { typeGroups, colors, sizes };
}

export const EMPTY_PRODUCT_FILTER_OPTIONS: ProductFilterOptions = {
  typeGroups: [],
  colors: [],
  sizes: [],
};
