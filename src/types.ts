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
  | 'milch'
  | 'fleisch'
  | 'brot'
  | 'getraenke'
  | 'tiefkuehl'
  | 'trocken'
  | 'suesses'
  | 'koerperpflege'
  | 'haushalt'
  | 'baby'
  | 'sonstiges';

export const CATEGORY_LABELS: Record<Category, string> = {
  'obst-gemuese': 'Obst & Gemüse',
  milch: 'Milchprodukte',
  fleisch: 'Fleisch & Wurst',
  brot: 'Brot & Backwaren',
  getraenke: 'Getränke',
  tiefkuehl: 'Tiefkühl',
  trocken: 'Trockenwaren',
  suesses: 'Süßes & Snacks',
  koerperpflege: 'Körperpflege',
  haushalt: 'Haushalt',
  baby: 'Baby',
  sonstiges: 'Sonstiges',
};

export type CategoryKind = 'grocery' | 'drugstore';

export const CATEGORY_KIND: Record<Category, CategoryKind> = {
  'obst-gemuese': 'grocery',
  milch: 'grocery',
  fleisch: 'grocery',
  brot: 'grocery',
  getraenke: 'grocery',
  tiefkuehl: 'grocery',
  trocken: 'grocery',
  suesses: 'grocery',
  koerperpflege: 'drugstore',
  haushalt: 'drugstore',
  baby: 'drugstore',
  sonstiges: 'grocery',
};

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
