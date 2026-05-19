import type { Category, Product, Store } from './types';

const SEARCH_URL = 'https://world.openfoodfacts.org/cgi/search.pl';

/**
 * Open Food Facts splits products across sibling databases by type. A code
 * registered in one is returned with status=0 + a "different product type"
 * hint by the others, so a single barcode scanner needs to ask each in turn
 * until one says yes.
 */
const PRODUCT_DB_URLS = [
  'https://world.openfoodfacts.org/api/v2/product',     // groceries
  'https://world.openbeautyfacts.org/api/v2/product',   // cosmetics, drugstore
  'https://world.openproductsfacts.org/api/v2/product', // household, misc
  'https://world.openpetfoodfacts.org/api/v2/product',  // pet food
];

interface OFFProduct {
  code?: string;
  product_name?: string;
  product_name_de?: string;
  generic_name_de?: string;
  brands?: string;
  image_front_small_url?: string;
  image_front_thumb_url?: string;
  image_small_url?: string;
  image_thumb_url?: string;
  categories_tags?: string[];
}

function mapCategory(tags: string[] | undefined): Category {
  if (!tags) return 'sonstiges';
  const t = tags.join(' ');
  if (/fruits|vegetables|obst|gemuese|gemüse/i.test(t)) return 'obst-gemuese';
  if (/baby/i.test(t)) return 'baby';
  if (/hygiene|cosmetics|koerperpflege|körperpflege/i.test(t)) return 'koerperpflege';
  if (/cleaning|haushalt|detergent/i.test(t)) return 'haushalt';
  if (/frozen|tiefkuehl|tiefkühl/i.test(t)) return 'tiefkuehl';
  if (/breads|bread|brot|broetchen|brötchen|baker|gebaeck|gebäck|rusks|crackers|toasts/i.test(t)) return 'brot-gebaeck';
  if (/dairies|milk|cheese|yogurt|milch|kaese|käse|joghurt|eggs|eier/i.test(t)) return 'milch-eier';
  if (/meat|fish|fleisch|wurst|sausage|seafood|hams|salamis|poultries/i.test(t)) return 'fleisch-fisch';
  if (/spreads|jams|honey|honig|marmelade|mueslis|granolas|breakfast-cereals|aufstrich/i.test(t)) return 'fruehstueck-aufstrich';
  if (/oils|öle|vinegar|essig|spices|gewuerze|gewürze|condiments|sauces|saucen|salts|salz/i.test(t)) return 'gewuerze-saucen';
  if (/snacks|chocolat|candy|sweet|bonbon|suess|süß|cookies|biscuits|chips|crisps|knabberei|confectioneries|gums|lollipops/i.test(t)) return 'suesses-knabberei';
  if (/beverages|drinks|getraenke|getränke|water|juice|beer|wine|coffee|tee|tea|cola|saft/i.test(t)) return 'getraenke';
  if (/pastas|cereals|rice|nudeln|reis|mehl|flours|sugars|legumes|canned|preserves|prepared-meals|ready-meals/i.test(t)) return 'vorrat';
  return 'sonstiges';
}

const GROCERY_STORES: Store[] = ['rewe', 'edeka', 'aldi', 'lidl'];
const DRUGSTORE_STORES: Store[] = ['dm', 'rossmann'];

export function defaultStoresForCategory(c: Category): Store[] {
  if (c === 'koerperpflege' || c === 'baby') return [...DRUGSTORE_STORES, 'rewe', 'edeka'];
  if (c === 'haushalt') return [...DRUGSTORE_STORES, ...GROCERY_STORES];
  return GROCERY_STORES;
}

function mapProduct(p: OFFProduct): Product | null {
  const name = p.product_name_de || p.product_name || p.generic_name_de;
  if (!name) return null;
  const category = mapCategory(p.categories_tags);
  return {
    id: p.code ? p.code : `off:${name}`,
    name: name.trim(),
    brand: p.brands?.split(',')[0]?.trim() || undefined,
    image: p.image_front_small_url || p.image_small_url || p.image_front_thumb_url || p.image_thumb_url,
    category,
    barcode: p.code,
    stores: defaultStoresForCategory(category),
  };
}

const searchCache = new Map<string, Product[]>();
const inflight = new Map<string, Promise<Product[]>>();
const SEARCH_CACHE_LIMIT = 80;

export async function searchProducts(query: string): Promise<Product[]> {
  const q = query.trim();
  if (!q) return [];
  const key = q.toLowerCase();
  const cached = searchCache.get(key);
  if (cached) return cached;
  const existing = inflight.get(key);
  if (existing) return existing;

  const promise = doSearch(q).then((mapped) => {
    if (searchCache.size >= SEARCH_CACHE_LIMIT) {
      const firstKey = searchCache.keys().next().value;
      if (firstKey !== undefined) searchCache.delete(firstKey);
    }
    searchCache.set(key, mapped);
    return mapped;
  });
  inflight.set(key, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(key);
  }
}

async function doSearch(q: string): Promise<Product[]> {
  const params = new URLSearchParams({
    search_terms: q,
    search_simple: '1',
    action: 'process',
    json: '1',
    page_size: '12',
    lc: 'de',
    fields:
      'code,product_name,product_name_de,generic_name_de,brands,image_front_small_url,image_front_thumb_url,image_small_url,image_thumb_url,categories_tags',
  });
  const url = `${SEARCH_URL}?${params.toString()}`;
  try {
    let res: Response;
    try {
      res = await fetch(url);
    } catch {
      await new Promise((r) => setTimeout(r, 600));
      res = await fetch(url);
    }
    if (!res.ok) return [];
    const data = await res.json();
    const products = (data.products as OFFProduct[] | undefined) ?? [];
    const mapped: Product[] = [];
    const seen = new Set<string>();
    for (const p of products) {
      const m = mapProduct(p);
      if (!m) continue;
      const dedupKey = m.name.toLowerCase();
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
      mapped.push(m);
    }
    return mapped;
  } catch (e) {
    console.warn('Open Food Facts search failed', e);
    return [];
  }
}

export async function lookupBarcode(barcode: string): Promise<Product | null> {
  const path = `${encodeURIComponent(barcode)}.json?lc=de&fields=code,product_name,product_name_de,generic_name_de,brands,image_front_small_url,image_front_thumb_url,image_small_url,image_thumb_url,categories_tags`;
  for (const base of PRODUCT_DB_URLS) {
    try {
      const res = await fetch(`${base}/${path}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status === 1 && data.product) return mapProduct(data.product);
      // status 0 means "not in this DB" — try the next one.
    } catch (e) {
      console.warn('Open Food Facts barcode lookup failed', base, e);
    }
  }
  return null;
}
