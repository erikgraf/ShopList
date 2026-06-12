import type { Category, Product, Store } from './types';
import { defaultStoresForCategory } from './openfoodfacts';
import { parseCSV } from './csv';

/** One row of `public/off-de-snapshot.csv` (written by build-catalog.mjs).
 *  `stores` is a `|`-separated list of Open Food Facts store IDs. */
interface RawRow {
  code: string;
  name: string;
  brand: string;
  image: string;
  category: Category;
  stores: string;
  /** LLM-derived generic product name (joined by code in build). May be absent
   *  if the snapshot hasn't been through `llm-generic-name.py join`. */
  generic?: string;
  /** Stage-2 taxonomy ids enriched at join time from data/taxonomy-map.csv +
   *  data/taxonomy.csv. Optional — absent rows simply won't match the
   *  Produkte / Kategorien tiers of the Meine % filter. */
  taxonomy_l3?: string;
  taxonomy_l2?: string;
}

interface IndexedProduct {
  product: Product;
  /** Normalized fields, indexed separately so ranking can distinguish a
   *  name match from a brand match from a generic-name match. The previous
   *  single concatenated haystack ranked "Ecover" (brand) below random
   *  substring hits like "R-ecover-y" because brand matches had no tier. */
  nameN: string;
  brandN: string;
  genericN: string;
  /** Space-stripped name+brand+generic for compound matching
   *  ("rostbra" inside "lupinenrostbratwuerstchen"). */
  joinedN: string;
}

const SNAPSHOT_URL = '/off-de-snapshot.csv';

let loadPromise: Promise<IndexedProduct[]> | null = null;
let indexed: IndexedProduct[] | null = null;
let attemptedAt = 0;
const RETRY_AFTER_MS = 30_000;

function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const KNOWN_STORES: Set<string> = new Set(['aldi', 'lidl', 'rewe', 'edeka', 'dm', 'rossmann']);

function parseStores(s: string | undefined, category: Category): Store[] {
  if (s) {
    const parsed = s.split('|').filter((t) => KNOWN_STORES.has(t)) as Store[];
    if (parsed.length) return parsed;
  }
  return defaultStoresForCategory(category);
}

function toProduct(r: RawRow): Product {
  return {
    id: r.code || `off:${r.name}`,
    name: r.name,
    brand: r.brand || undefined,
    image: r.image || undefined,
    category: r.category,
    genericName: r.generic || undefined,
    taxonomyL3: r.taxonomy_l3 || undefined,
    taxonomyL2: r.taxonomy_l2 || undefined,
    barcode: r.code || undefined,
    stores: parseStores(r.stores, r.category),
  };
}

async function load(): Promise<IndexedProduct[]> {
  if (indexed && indexed.length > 0) return indexed;
  if (loadPromise) return loadPromise;
  // Don't re-fetch on every keystroke if the last attempt failed recently.
  if (indexed && Date.now() - attemptedAt < RETRY_AFTER_MS) return indexed;
  loadPromise = (async () => {
    attemptedAt = Date.now();
    try {
      // Use default HTTP caching — server can return 304 on no-change, but a
      // refreshed snapshot is picked up. The Workbox service worker still
      // gives us cache-first behaviour in production via its own runtime cache.
      const res = await fetch(SNAPSHOT_URL);
      if (!res.ok) {
        indexed = [];
        return indexed;
      }
      const rows = parseCSV(await res.text()) as unknown as RawRow[];
      indexed = rows.map((r) => {
        const product = toProduct(r);
        const nameN = norm(r.name);
        const brandN = norm(r.brand ?? '');
        // The generic name is indexed so typing "Weizenbier" surfaces
        // "Erdinger Alkoholfrei" — the brand SKU whose generic is Weizenbier.
        const genericN = norm(r.generic ?? '');
        const joinedN = `${nameN} ${brandN} ${genericN}`.replace(/ /g, '');
        return { product, nameN, brandN, genericN, joinedN };
      });
      return indexed;
    } catch {
      indexed = [];
      return indexed;
    } finally {
      loadPromise = null;
    }
  })();
  return loadPromise;
}

/** Kick off snapshot download at app start; the result is cached for later searches. */
export function warmSnapshot(): void {
  void load();
}

/**
 * Field-aware ranked search. Tiers (high → low):
 *
 *   name exact > name prefix > name-word prefix
 *   > brand exact/prefix              ← "ecover" ranks every Ecover SKU here
 *   > generic-name prefix             ← "weizenbier" → Erdinger Alkoholfrei
 *   > every query token prefixes some word (multi-word queries)
 *   > compound substring in the name  ← "rostbra" in Lupinenrostbratwürstchen
 *   > compound substring in brand/generic
 *
 * Small completeness boosts (image, brand) break ties so the visually
 * richest SKU represents each rank band. Sort is stable, so equal scores
 * keep snapshot (dump-quality) order.
 */
export async function searchSnapshot(query: string, limit = 8): Promise<Product[]> {
  const q = norm(query);
  if (!q) return [];
  const tokens = q.split(' ').filter(Boolean);
  if (!tokens.length) return [];
  const qJoined = tokens.join('');

  const items = await load();
  if (!items.length) return [];

  const scored: { score: number; product: Product }[] = [];
  for (const it of items) {
    let s = 0;
    if (it.nameN === q) s = 1000;
    else if (it.nameN.startsWith(q)) s = 900;
    else if (it.nameN.split(' ').some((w) => w.startsWith(q))) s = 800;
    else if (it.brandN === q) s = 760;
    else if (it.brandN && it.brandN.split(' ').some((w) => w.startsWith(q))) s = 700;
    else if (it.genericN && it.genericN.split(' ').some((w) => w.startsWith(q))) s = 620;
    else if (
      tokens.length > 1 &&
      tokens.every((t) =>
        `${it.nameN} ${it.brandN} ${it.genericN}`.split(' ').some((w) => w.startsWith(t)),
      )
    ) {
      s = 520;
    } else if (qJoined.length >= 5 && it.nameN.replace(/ /g, '').includes(qJoined)) {
      // German-compound exception: substantial fragments may sit inside a
      // Kompositum ("rostbra" in "lupinenrostbratwuerstchen"). Length-gated
      // so short inputs only ever match from the beginning of words.
      s = 320;
    } else if (qJoined.length >= 5 && it.joinedN.includes(qJoined)) s = 260;
    else continue;

    if (it.product.image) s += 6;
    if (it.product.brand) s += 2;
    scored.push({ score: s, product: it.product });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((e) => e.product);
}

export async function lookupBarcodeInSnapshot(code: string): Promise<Product | null> {
  const items = await load();
  for (const it of items) {
    if (it.product.barcode === code) return it.product;
  }
  return null;
}

export async function isSnapshotReady(): Promise<boolean> {
  return (await load()).length > 0;
}
