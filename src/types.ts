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
  /** The generic this SKU/concept belongs to (see `generics.ts`). Resolved at
   *  add-time from the name + category when not set explicitly. Optional during
   *  the prototype — the long tail of OFF products has no generic yet. */
  genericId?: string;
  /** LLM-derived generic product name for the OFF long tail, e.g. "Weizenbier
   *  alkoholfrei" for an Erdinger SKU. Distinct from `genericId` (a curated
   *  registry slug): this is a free-form German label that every snapshot
   *  product carries (joined by `code` from data/llm-generic-names.csv). It's
   *  the key for finding offers/alternatives across brands, and a strong signal
   *  for resolving the curated `genericId`. See data/README "generic names". */
  genericName?: string;
  barcode?: string;
  /** Stores where this is typically bought; empty = inferred from category */
  stores?: Store[];
  /** Optional reference into `icons-library.tsx` ICONS map */
  icon?: string;
  /** Common pack sizes shown as quick-pick chips in the quantity sheet.
   *  e.g. Bier → [1, 6, 12, 24] (single bottle, sixpack, 12er, Kasten). */
  sizes?: number[];
}

export interface Item {
  id: string;
  /** Which shopping list this item belongs to. Backfilled to "default" by the
   *  Dexie v3 upgrade for items added before multi-list existed. */
  listId: string;
  productId: string;
  /** Generic this item rolls up to (see `generics.ts`). Backfilled by the
   *  Dexie v9 upgrade by resolving from name + category. Drives the generic
   *  header grouping and lets per-store own-brand suggestions reuse the
   *  generic's `brandKey`. */
  genericId?: string;
  /** LLM-derived generic product name carried over from the snapshot Product
   *  at add-time (see `Product.genericName`). Persisted so a later offers/
   *  alternatives feature can match this item to deals without re-deriving it. */
  genericName?: string;
  /** Current discount percent if this item is on offer. Populated by the
   *  offers service — matches `genericName` / barcode against deal data (see
   *  `data/llm-generic-names.csv` and the taxonomy artefact). Absent = not on
   *  offer. Drives the "Meine %" filter and the −N % row badge. Optional, so
   *  no Dexie migration is required. */
  offer?: number;
  name: string;
  /** Global/default brand — what to show when no store filter is active, and
   *  the last-resort fallback when neither a per-store pick nor a suggestion
   *  exists. */
  brand?: string;
  /** Per-store brand overrides. When a single store chip is active, this map
   *  wins over `brand` so that switching from DM to Aldi swaps Kamill for
   *  Lacura on the same logical "Handcreme" item. */
  brandByStore?: Partial<Record<Store, string>>;
  image?: string;
  category: Category;
  barcode?: string;
  stores: Store[];
  quantity: number;
  unit: string;
  checked: boolean;
  addedAt: number;
  /** Last-write timestamp (ms epoch). Set on every mutation; drives last-
   *  writer-wins merging when a list is shared with another device. Backfilled
   *  from `addedAt` for items created before sync existed (Dexie v4). */
  updatedAt: number;
  /** Soft-delete tombstone (ms epoch). Hard-delete stays the default for
   *  local-only lists; when sync lands, deletes inside a shared list write
   *  this field instead so the deletion can propagate to the partner. */
  deletedAt?: number;
  position: number;
  icon?: string;
  sizes?: number[];
}

export interface ShopList {
  id: string;
  name: string;
  createdAt: number;
  /** Last-write timestamp for list metadata (currently just `name`). Same role
   *  as `Item.updatedAt` — backfilled from `createdAt` by the Dexie v4
   *  migration for lists created before sync. */
  updatedAt: number;
  /** Order in the list-switcher wheel (low number = leftmost). */
  position: number;
  /** Cloud-sync metadata. Present iff the user has explicitly shared this
   *  list. The `id` doubles as the magic-URL secret — possession grants
   *  read/write. `lastPulledVersion` is the highest server `version` we've
   *  already merged into this device, used by the poll loop to skip noop
   *  responses. */
  cloud?: {
    id: string;
    lastPulledVersion: number;
    lastSyncedAt: number;
  };
}

/** The id of the always-present default list. */
export const DEFAULT_LIST_ID = 'default';
export const DEFAULT_LIST_NAME = 'Einkaufsliste';

export interface RecentProduct extends Product {
  lastUsedAt: number;
  useCount: number;
}

/**
 * Row in `db.unknownBarcodes`. Logged when a scan returns no match from
 * any OFF sister-DB (Food / Beauty / Products / PetFood). Lets us mine
 * real-world cold-cache misses later — either to grow the snapshot or
 * to wire a "report this product" affordance pointing back at OFF.
 *
 * Append-on-first-sighting, increment on re-scan. Never read by the
 * main app loop; lives outside the per-list `items` table on purpose.
 */
export interface UnknownBarcode {
  barcode: string;
  firstSeenAt: number;
  lastSeenAt: number;
  count: number;
  /** What the user typed as a name when they fell through to the manual
   *  "Artikel <code>" path, if anything. Useful context if we ever want
   *  to retro-fit guesses for the snapshot. */
  userName?: string;
}
