export type Store = 'aldi' | 'lidl' | 'rewe' | 'edeka' | 'dm' | 'rossmann';

export const STORES: { id: Store; label: string; kind: 'grocery' | 'drugstore' }[] = [
  { id: 'aldi', label: 'Aldi', kind: 'grocery' },
  { id: 'lidl', label: 'Lidl', kind: 'grocery' },
  { id: 'rewe', label: 'Rewe', kind: 'grocery' },
  { id: 'edeka', label: 'Edeka', kind: 'grocery' },
  { id: 'dm', label: 'DM', kind: 'drugstore' },
  { id: 'rossmann', label: 'Rossmann', kind: 'drugstore' },
];

export type Category =
  | 'obst-gemuese'
  | 'brot-gebaeck'
  | 'milch-eier'
  | 'fleisch-fisch'
  | 'tiefkuehl'
  | 'vorrat'
  | 'gewuerze-saucen'
  | 'fruehstueck-aufstrich'
  | 'suesses-knabberei'
  | 'getraenke'
  | 'koerperpflege'
  | 'haushalt'
  | 'baby'
  | 'sonstiges';

export const CATEGORY_LABELS: Record<Category, string> = {
  'obst-gemuese': 'Obst & Gemüse',
  'brot-gebaeck': 'Brot & Gebäck',
  'milch-eier': 'Milchprodukte & Eier',
  'fleisch-fisch': 'Fleisch & Fisch',
  tiefkuehl: 'Tiefkühl',
  vorrat: 'Vorrat & Konserven',
  'gewuerze-saucen': 'Gewürze, Öle & Saucen',
  'fruehstueck-aufstrich': 'Frühstück & Aufstrich',
  'suesses-knabberei': 'Süßes & Knabberei',
  getraenke: 'Getränke',
  koerperpflege: 'Körperpflege',
  haushalt: 'Haushalt',
  baby: 'Baby',
  sonstiges: 'Sonstiges',
};

/**
 * Order categories follow the typical German supermarket walk: enter through
 * fresh produce, work past the bakery and chilled aisles, then frozen, then
 * shelf-stable, end on non-food. Items group under headers in this order so
 * the list mirrors the route you actually take.
 */
export const CATEGORY_ORDER: Category[] = [
  'obst-gemuese',
  'brot-gebaeck',
  'milch-eier',
  'fleisch-fisch',
  'tiefkuehl',
  'vorrat',
  'gewuerze-saucen',
  'fruehstueck-aufstrich',
  'suesses-knabberei',
  'getraenke',
  'koerperpflege',
  'haushalt',
  'baby',
  'sonstiges',
];

export type CategoryKind = 'grocery' | 'drugstore';

export const CATEGORY_KIND: Record<Category, CategoryKind> = {
  'obst-gemuese': 'grocery',
  'brot-gebaeck': 'grocery',
  'milch-eier': 'grocery',
  'fleisch-fisch': 'grocery',
  tiefkuehl: 'grocery',
  vorrat: 'grocery',
  'gewuerze-saucen': 'grocery',
  'fruehstueck-aufstrich': 'grocery',
  'suesses-knabberei': 'grocery',
  getraenke: 'grocery',
  koerperpflege: 'drugstore',
  haushalt: 'drugstore',
  baby: 'drugstore',
  sonstiges: 'grocery',
};

/**
 * Legacy → current category mapping for items stored under the old 12-cat
 * scheme. Used by the Dexie v2 upgrade and the snapshot loader.
 */
export const LEGACY_CATEGORY_MAP: Record<string, Category> = {
  // unchanged
  'obst-gemuese': 'obst-gemuese',
  tiefkuehl: 'tiefkuehl',
  getraenke: 'getraenke',
  koerperpflege: 'koerperpflege',
  haushalt: 'haushalt',
  baby: 'baby',
  sonstiges: 'sonstiges',
  // renamed
  brot: 'brot-gebaeck',
  milch: 'milch-eier',
  fleisch: 'fleisch-fisch',
  suesses: 'suesses-knabberei',
  // split — bulk-assign to the largest target; users can re-bucket per item
  trocken: 'vorrat',
};

export function migrateCategory(c: string | Category): Category {
  if ((c as Category) in CATEGORY_LABELS) return c as Category;
  return LEGACY_CATEGORY_MAP[c] ?? 'sonstiges';
}

export interface Product {
  /** Stable identifier — barcode if available, else "local:<slug>" */
  id: string;
  name: string;
  brand?: string;
  image?: string;
  category: Category;
  barcode?: string;
  /** Stores where this is typically bought; empty = inferred from category */
  stores?: Store[];
}

export interface Item {
  id: string;
  productId: string;
  name: string;
  brand?: string;
  image?: string;
  category: Category;
  barcode?: string;
  stores: Store[];
  quantity: number;
  unit: string;
  checked: boolean;
  addedAt: number;
  position: number;
}

export interface RecentProduct extends Product {
  lastUsedAt: number;
  useCount: number;
}
