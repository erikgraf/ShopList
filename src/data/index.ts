/**
 * Single load point for the human-editable CSVs in `/data`. These CSVs are the
 * **source of truth** — the app parses them at build time (Vite `?raw` inlines
 * the file contents into the bundle, so there's no runtime fetch and nothing
 * extra ships). Edit a CSV, reload, done. See `data/README.md` for the schema
 * and the data-flow diagrams.
 *
 * Only the genuinely list-shaped data lives here (catalog, generics, store
 * brands). The 14-row category table is type-coupled to the `Category` union in
 * `types.ts`, so it stays there; `data/categories.csv` mirrors it under a guard
 * test (`src/data/categories.sync.test.ts`).
 */
import type { Category, Product, Store } from '../types';
import type { Generic } from '../generics';
import type { StoreBrandEntry } from '../store-brands';
import catalogCsv from '../../data/catalog.csv?raw';
import genericsCsv from '../../data/generics.csv?raw';
import storeBrandsCsv from '../../data/store-brands.csv?raw';

/** RFC-4180-ish parser: quoted fields, embedded commas, and "" escapes. Returns
 *  one object per row keyed by the header. Small on purpose — our CSVs are
 *  plain, but names like "Gewürze, Öle & Saucen" need real quote handling. */
export function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;
  let sawField = false;
  const endField = () => {
    record.push(field);
    field = '';
    sawField = true;
  };
  const endRecord = () => {
    rows.push(record);
    record = [];
    sawField = false;
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') endField();
    else if (c === '\n') {
      endField();
      endRecord();
    } else if (c !== '\r') field += c;
  }
  if (field.length > 0 || sawField || record.length > 0) {
    endField();
    endRecord();
  }
  const header = rows.shift() ?? [];
  return rows
    .filter((r) => r.some((c) => c !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

const list = (v: string): string[] => (v ? v.split('|') : []);
const opt = (v: string): string | undefined => v || undefined;

export const CATALOG: Product[] = parseCSV(catalogCsv).map((r) => ({
  id: r.id,
  name: r.name,
  brand: opt(r.brand),
  category: r.category as Category,
  icon: opt(r.icon),
  stores: list(r.stores) as Store[],
  sizes: r.sizes ? r.sizes.split('|').map(Number) : undefined,
}));

export const GENERICS: Generic[] = parseCSV(genericsCsv).map((r) => ({
  id: r.id,
  name: r.name,
  category: r.category as Category,
  parentId: opt(r.parentId),
  aliases: r.aliases ? r.aliases.split('|') : undefined,
  icon: opt(r.icon),
  brandKey: opt(r.brandKey),
}));

const BRAND_STORES: Store[] = ['aldi', 'lidl', 'rewe', 'edeka', 'dm', 'rossmann'];

export const STORE_BRAND_MAP: Record<string, StoreBrandEntry> = {};
export const KEY_LABELS: Record<string, string> = {};
for (const r of parseCSV(storeBrandsCsv)) {
  const def: Partial<Record<Store, string>> = {};
  const bio: Partial<Record<Store, string>> = {};
  for (const s of BRAND_STORES) {
    if (r[`default_${s}`]) def[s] = r[`default_${s}`];
    if (r[`bio_${s}`]) bio[s] = r[`bio_${s}`];
  }
  STORE_BRAND_MAP[r.key] = Object.keys(bio).length ? { default: def, bio } : { default: def };
  KEY_LABELS[r.key] = r.label;
}
