import type { Category, Product, Store } from './types';
import { defaultStoresForCategory } from './openfoodfacts';

/** Compact on-disk row shape (matches scripts/build-catalog.mjs trim()). */
interface RawRow {
  c: string; // barcode/code
  n: string; // name
  b: string; // brand
  i: string; // image
  k: Category; // category
}

interface SnapshotFile {
  source: string;
  generatedAt: string;
  count: number;
  products: RawRow[];
}

interface IndexedProduct {
  product: Product;
  /** Concatenated, normalized "name brand" used for substring/prefix matching. */
  haystack: string;
}

const SNAPSHOT_URL = '/off-de-snapshot.json';

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

function toProduct(r: RawRow): Product {
  const stores: Store[] = defaultStoresForCategory(r.k);
  return {
    id: r.c || `off:${r.n}`,
    name: r.n,
    brand: r.b || undefined,
    image: r.i || undefined,
    category: r.k,
    barcode: r.c || undefined,
    stores,
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
      // refreshed snapshot.json is picked up. The Workbox service worker still
      // gives us cache-first behaviour in production via its own runtime cache.
      const res = await fetch(SNAPSHOT_URL);
      if (!res.ok) {
        indexed = [];
        return indexed;
      }
      const data = (await res.json()) as SnapshotFile;
      indexed = data.products.map((r) => {
        const product = toProduct(r);
        const haystack = norm(`${r.n} ${r.b}`);
        return { product, haystack };
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

export async function searchSnapshot(query: string, limit = 8): Promise<Product[]> {
  const q = norm(query);
  if (!q) return [];
  const tokens = q.split(' ').filter(Boolean);
  if (!tokens.length) return [];
  const qJoined = tokens.join('');

  const items = await load();
  if (!items.length) return [];

  const exact: Product[] = [];
  const prefix: Product[] = [];
  const allTokens: Product[] = [];

  for (const it of items) {
    const h = it.haystack;
    const hJoined = h.replace(/ /g, '');
    if (h === q || hJoined === qJoined) {
      exact.push(it.product);
      if (exact.length >= limit) break;
    } else if (h.startsWith(q) || hJoined.startsWith(qJoined)) {
      if (prefix.length < limit) prefix.push(it.product);
    } else if (tokens.every((t) => hJoined.includes(t))) {
      if (allTokens.length < limit) allTokens.push(it.product);
    }
  }

  return [...exact, ...prefix, ...allTokens].slice(0, limit);
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
