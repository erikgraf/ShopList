import type { Category, Item, Store } from './types';

export type Status = 'open' | 'done';

export interface FilterState {
  stores: Set<Store>;
  categories: Set<Category>;
  brands: Set<string>;
  statuses: Set<Status>;
}

export const emptyFilter = (): FilterState => ({
  stores: new Set(),
  categories: new Set(),
  brands: new Set(),
  statuses: new Set(),
});

export function isEmpty(f: FilterState): boolean {
  return !f.stores.size && !f.categories.size && !f.brands.size && !f.statuses.size;
}

export function countFilters(f: FilterState): number {
  return f.stores.size + f.categories.size + f.brands.size + f.statuses.size;
}

interface Predicates {
  matchesStore: (it: Item) => boolean;
  matchesCategory: (it: Item) => boolean;
  matchesBrand: (it: Item) => boolean;
  matchesStatus: (it: Item) => boolean;
}

function predicates(f: FilterState): Predicates {
  const status = (it: Item): boolean => {
    if (!f.statuses.size) return true;
    if (f.statuses.has('open') && !it.checked) return true;
    if (f.statuses.has('done') && it.checked) return true;
    return false;
  };
  const store = (it: Item): boolean => {
    if (!f.stores.size) return true;
    for (const s of it.stores) if (f.stores.has(s)) return true;
    return false;
  };
  const category = (it: Item): boolean => !f.categories.size || f.categories.has(it.category);
  const brand = (it: Item): boolean => !f.brands.size || (!!it.brand && f.brands.has(it.brand));

  return {
    matchesStore: store,
    matchesCategory: category,
    matchesBrand: brand,
    matchesStatus: status,
  };
}

export function applyFilter(items: Item[], f: FilterState): Item[] {
  if (isEmpty(f)) return items;
  const p = predicates(f);
  return items.filter((it) => p.matchesStore(it) && p.matchesCategory(it) && p.matchesBrand(it) && p.matchesStatus(it));
}

export interface FacetCounts {
  stores: Map<Store, number>;
  categories: Map<Category, number>;
  brands: Map<string, number>;
  statuses: Map<Status, number>;
}

/**
 * Classic faceted-search count semantics: for each facet, count items that match
 * the OTHER facets but ignore this facet's own filter. So toggling a value in
 * one facet doesn't make the rest of that facet's chips disappear.
 */
export function computeFacets(items: Item[], f: FilterState): FacetCounts {
  const p = predicates(f);

  const stores = new Map<Store, number>();
  const categories = new Map<Category, number>();
  const brands = new Map<string, number>();
  const statuses = new Map<Status, number>();

  for (const it of items) {
    const okOthersForStore = p.matchesCategory(it) && p.matchesBrand(it) && p.matchesStatus(it);
    const okOthersForCategory = p.matchesStore(it) && p.matchesBrand(it) && p.matchesStatus(it);
    const okOthersForBrand = p.matchesStore(it) && p.matchesCategory(it) && p.matchesStatus(it);
    const okOthersForStatus = p.matchesStore(it) && p.matchesCategory(it) && p.matchesBrand(it);

    if (okOthersForStore) {
      for (const s of it.stores) stores.set(s, (stores.get(s) ?? 0) + 1);
    }
    if (okOthersForCategory) {
      categories.set(it.category, (categories.get(it.category) ?? 0) + 1);
    }
    if (okOthersForBrand && it.brand) {
      brands.set(it.brand, (brands.get(it.brand) ?? 0) + 1);
    }
    if (okOthersForStatus) {
      const k: Status = it.checked ? 'done' : 'open';
      statuses.set(k, (statuses.get(k) ?? 0) + 1);
    }
  }

  return { stores, categories, brands, statuses };
}

export function toggleInSet<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}
