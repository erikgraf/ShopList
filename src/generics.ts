import type { Category, Product, Store } from './types';
import { defaultStoresForCategory } from './openfoodfacts';

/**
 * The "generic product" tier — the concept a shopper has in mind, independent
 * of brand or store. "Joghurt" is a generic; "Landliebe Joghurt 3.8%" (a
 * scanned barcode) and "Griechischer Joghurt" (a variant) both resolve to it.
 *
 * This is the missing middle layer between {@link Category} and the concrete
 * {@link Product} (SKU). Today the same idea is smeared across three places
 * that don't reference each other:
 *   1. flat catalog rows  (`local:joghurt`)        — catalog.ts
 *   2. brand-map keys      (`joghurt`)              — store-brands.ts
 *   3. display labels      (`KEY_LABELS.joghurt`)   — store-brands.ts
 * `Generic` is the single entity those should collapse into. `brandKey` keeps
 * the link to STORE_BRAND_MAP so per-store own-brand suggestions still work
 * without duplicating that data here.
 */
export interface Generic {
  /** Stable slug, e.g. `joghurt`. Referenced by `Product.genericId`. */
  id: string;
  /** Display name shown on the list row, e.g. `Joghurt`. */
  name: string;
  category: Category;
  /** Parent generic for the variant hierarchy: `griechischer-joghurt`'s parent
   *  is `joghurt`; `speisequark-20`'s parent is `speisequark`. Grouping in the
   *  autocomplete walks to the root ancestor. */
  parentId?: string;
  /** Extra search terms folded into the index: `spq` → Speisequark, `greek
   *  yoghurt` → Griechischer Joghurt, `klopapier` → Toilettenpapier. Matched
   *  whole-token, which avoids the substring footgun in `matchItemKey`
   *  (where "Buttermilch" hits both `butter` and `milch`). */
  aliases?: string[];
  /** Icon name in `icons-library`. Inherited from the parent when omitted. */
  icon?: string;
  /** Key into STORE_BRAND_MAP for per-store own-brand suggestions. Inherited
   *  from the parent when omitted, so all `joghurt` variants share its brands. */
  brandKey?: string;
}

/**
 * Prototype registry. Deliberately not exhaustive — it covers the dairy aisle
 * in depth (the variant hierarchy the feature is really about) plus a broad
 * spread of the existing STORE_BRAND_MAP keys so the brand engine routes
 * through generics. Author-time data for now; see the README "build/update"
 * notes for the runtime-editable path.
 */
export const GENERICS: Generic[] = [
  // --- Milchprodukte: depth demo (parent → variants) --------------------
  { id: 'milch', name: 'Milch', category: 'milch-eier', icon: 'milch', brandKey: 'milch' },
  { id: 'vollmilch', name: 'Vollmilch', category: 'milch-eier', parentId: 'milch' },
  { id: 'milch-fettarm', name: 'Milch fettarm', category: 'milch-eier', parentId: 'milch', aliases: ['fettarme milch'] },
  { id: 'milch-laktosefrei', name: 'Milch laktosefrei', category: 'milch-eier', parentId: 'milch', aliases: ['laktosefreie milch', 'lactose free milk'] },
  { id: 'h-milch', name: 'H-Milch', category: 'milch-eier', parentId: 'milch', aliases: ['h milch', 'haltbare milch'] },
  { id: 'hafermilch', name: 'Hafermilch', category: 'milch-eier', parentId: 'milch', aliases: ['hafer drink', 'oat milk'] },
  { id: 'sojamilch', name: 'Sojamilch', category: 'milch-eier', parentId: 'milch', aliases: ['soja drink', 'soy milk'] },
  { id: 'mandelmilch', name: 'Mandelmilch', category: 'milch-eier', parentId: 'milch', aliases: ['almond milk'] },

  { id: 'joghurt', name: 'Joghurt', category: 'milch-eier', icon: 'joghurt', brandKey: 'joghurt', aliases: ['yoghurt', 'yogurt'] },
  { id: 'naturjoghurt', name: 'Naturjoghurt', category: 'milch-eier', parentId: 'joghurt', aliases: ['natur joghurt'] },
  { id: 'griechischer-joghurt', name: 'Griechischer Joghurt', category: 'milch-eier', parentId: 'joghurt', aliases: ['griechischer joghurt', 'griech joghurt', 'greek yoghurt', 'greek yogurt'] },
  { id: 'joghurt-laktosefrei', name: 'Joghurt laktosefrei', category: 'milch-eier', parentId: 'joghurt', aliases: ['laktosefreier joghurt', 'lactose free yoghurt', 'lactose free yogurt'] },
  { id: 'skyr', name: 'Skyr', category: 'milch-eier', parentId: 'joghurt', icon: 'joghurt' },

  { id: 'quark', name: 'Quark', category: 'milch-eier', icon: 'joghurt', brandKey: 'quark' },
  { id: 'speisequark', name: 'Speisequark', category: 'milch-eier', parentId: 'quark', aliases: ['spq'] },
  { id: 'speisequark-magerstufe', name: 'Speisequark Magerstufe', category: 'milch-eier', parentId: 'speisequark', aliases: ['spq mager', 'spq magerstufe', 'magerquark', 'quark magerstufe'] },
  { id: 'speisequark-20', name: 'Speisequark 20%', category: 'milch-eier', parentId: 'speisequark', aliases: ['spq 20', 'quark 20', 'speisequark 20'] },
  { id: 'speisequark-40', name: 'Speisequark 40%', category: 'milch-eier', parentId: 'speisequark', aliases: ['spq 40', 'quark 40', 'speisequark 40'] },

  { id: 'butter', name: 'Butter', category: 'milch-eier', icon: 'butter', brandKey: 'butter' },
  { id: 'sahne', name: 'Sahne', category: 'milch-eier', icon: 'milch', brandKey: 'sahne' },
  { id: 'kaese', name: 'Käse', category: 'milch-eier', icon: 'kaese', brandKey: 'kaese' },
  { id: 'frischkaese', name: 'Frischkäse', category: 'milch-eier', parentId: 'kaese' },
  { id: 'mozzarella', name: 'Mozzarella', category: 'milch-eier', parentId: 'kaese' },
  { id: 'eier', name: 'Eier', category: 'milch-eier', icon: 'ei', brandKey: 'eier' },

  // --- Brot & Gebäck ----------------------------------------------------
  { id: 'brot', name: 'Brot', category: 'brot-gebaeck', icon: 'brot', brandKey: 'brot' },
  { id: 'broetchen', name: 'Brötchen', category: 'brot-gebaeck', icon: 'broetchen', brandKey: 'broetchen' },
  { id: 'toast', name: 'Toastbrot', category: 'brot-gebaeck', icon: 'toast', brandKey: 'toast', aliases: ['toast'] },

  // --- Vorrat -----------------------------------------------------------
  { id: 'nudeln', name: 'Nudeln', category: 'vorrat', icon: 'nudeln', brandKey: 'nudeln', aliases: ['pasta'] },
  { id: 'reis', name: 'Reis', category: 'vorrat', icon: 'reis', brandKey: 'reis' },
  { id: 'mehl', name: 'Mehl', category: 'vorrat', icon: 'mehl', brandKey: 'mehl' },
  { id: 'zucker', name: 'Zucker', category: 'vorrat', icon: 'mehl', brandKey: 'zucker' },

  // --- Gewürze, Öle & Saucen -------------------------------------------
  { id: 'olivenoel', name: 'Olivenöl', category: 'gewuerze-saucen', icon: 'olivenoel', brandKey: 'olivenoel' },
  { id: 'essig', name: 'Essig', category: 'gewuerze-saucen', icon: 'olivenoel', brandKey: 'essig' },

  // --- Frühstück & Aufstrich -------------------------------------------
  { id: 'marmelade', name: 'Marmelade', category: 'fruehstueck-aufstrich', icon: 'marmelade', brandKey: 'marmelade', aliases: ['konfituere'] },
  { id: 'honig', name: 'Honig', category: 'fruehstueck-aufstrich', icon: 'honig', brandKey: 'honig' },

  // --- Süßes & Knabberei ------------------------------------------------
  { id: 'schokolade', name: 'Schokolade', category: 'suesses-knabberei', icon: 'schokolade', brandKey: 'schokolade' },
  { id: 'kekse', name: 'Kekse', category: 'suesses-knabberei', icon: 'keks', brandKey: 'kekse' },
  { id: 'chips', name: 'Chips', category: 'suesses-knabberei', icon: 'chips', brandKey: 'chips' },
  { id: 'gummibaerchen', name: 'Gummibärchen', category: 'suesses-knabberei', icon: 'keks', brandKey: 'gummibaerchen' },

  // --- Getränke ---------------------------------------------------------
  { id: 'wasser', name: 'Wasser', category: 'getraenke', icon: 'wasser', brandKey: 'wasser' },
  { id: 'mineralwasser', name: 'Mineralwasser', category: 'getraenke', parentId: 'wasser', icon: 'wasser', brandKey: 'mineralwasser' },
  { id: 'saft', name: 'Saft', category: 'getraenke', icon: 'saft', brandKey: 'saft' },
  { id: 'cola', name: 'Cola', category: 'getraenke', icon: 'cola', brandKey: 'cola' },
  { id: 'limonade', name: 'Limonade', category: 'getraenke', icon: 'cola', brandKey: 'limonade' },
  { id: 'bier', name: 'Bier', category: 'getraenke', icon: 'cola', brandKey: 'bier' },
  { id: 'wein', name: 'Wein', category: 'getraenke', icon: 'cola', brandKey: 'wein' },
  { id: 'kaffee', name: 'Kaffee', category: 'getraenke', brandKey: 'kaffee' },
  { id: 'tee', name: 'Tee', category: 'getraenke', icon: 'tee', brandKey: 'tee' },

  // --- Körperpflege -----------------------------------------------------
  { id: 'handcreme', name: 'Handcreme', category: 'koerperpflege', icon: 'creme', brandKey: 'handcreme' },
  { id: 'bodylotion', name: 'Bodylotion', category: 'koerperpflege', icon: 'creme', brandKey: 'bodylotion' },
  { id: 'gesichtscreme', name: 'Gesichtscreme', category: 'koerperpflege', icon: 'creme', brandKey: 'gesichtscreme' },
  { id: 'sonnencreme', name: 'Sonnencreme', category: 'koerperpflege', icon: 'creme', brandKey: 'sonnencreme' },
  { id: 'shampoo', name: 'Shampoo', category: 'koerperpflege', icon: 'shampoo', brandKey: 'shampoo' },
  { id: 'trockenshampoo', name: 'Trockenshampoo', category: 'koerperpflege', parentId: 'shampoo', icon: 'shampoo', brandKey: 'trockenshampoo' },
  { id: 'spuelung', name: 'Haarspülung', category: 'koerperpflege', icon: 'shampoo', brandKey: 'spuelung', aliases: ['spuelung'] },
  { id: 'duschgel', name: 'Duschgel', category: 'koerperpflege', icon: 'shampoo', brandKey: 'duschgel' },
  { id: 'zahnpasta', name: 'Zahnpasta', category: 'koerperpflege', icon: 'zahnpasta', brandKey: 'zahnpasta' },
  { id: 'zahnbuerste', name: 'Zahnbürste', category: 'koerperpflege', icon: 'zahnbuerste', brandKey: 'zahnbuerste' },
  { id: 'deo', name: 'Deo', category: 'koerperpflege', icon: 'deo', brandKey: 'deo' },
  { id: 'seife', name: 'Seife', category: 'koerperpflege', icon: 'seife', brandKey: 'seife' },
  { id: 'taschentuecher', name: 'Taschentücher', category: 'koerperpflege', icon: 'taschentuch', brandKey: 'taschentuecher', aliases: ['tempo'] },

  // --- Haushalt ---------------------------------------------------------
  { id: 'waschmittel', name: 'Waschmittel', category: 'haushalt', icon: 'waschmittel', brandKey: 'waschmittel' },
  { id: 'weichspueler', name: 'Weichspüler', category: 'haushalt', icon: 'waschmittel', brandKey: 'weichspueler' },
  { id: 'spuelmittel', name: 'Spülmittel', category: 'haushalt', icon: 'sprayflasche', brandKey: 'spuelmittel' },
  { id: 'allzweckreiniger', name: 'Allzweckreiniger', category: 'haushalt', icon: 'sprayflasche', brandKey: 'allzweckreiniger' },
  { id: 'toilettenpapier', name: 'Toilettenpapier', category: 'haushalt', icon: 'klopapier', brandKey: 'toilettenpapier', aliases: ['klopapier', 'klorolle'] },
  { id: 'kuechenrolle', name: 'Küchenrolle', category: 'haushalt', icon: 'klopapier', brandKey: 'kuechenrolle' },

  // --- Baby -------------------------------------------------------------
  { id: 'windel', name: 'Windeln', category: 'baby', icon: 'babyflasche', brandKey: 'windel', aliases: ['windeln'] },
];

const norm = (s: string): string =>
  s
    .toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const BY_ID = new Map<string, Generic>(GENERICS.map((g) => [g.id, g]));

export function getGeneric(id: string | undefined): Generic | undefined {
  return id ? BY_ID.get(id) : undefined;
}

/** Walk `parentId` to the top-level ancestor. Used to group variants under a
 *  single header in the autocomplete ("Quark" over all Speisequark variants). */
export function rootGeneric(id: string | undefined): Generic | undefined {
  let g = getGeneric(id);
  const seen = new Set<string>();
  while (g?.parentId && !seen.has(g.id)) {
    seen.add(g.id);
    g = getGeneric(g.parentId);
  }
  return g;
}

/** Resolve an inherited field (icon, brandKey) by walking up the parent chain. */
function inherited(g: Generic, field: 'icon' | 'brandKey'): string | undefined {
  let cur: Generic | undefined = g;
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    if (cur[field]) return cur[field];
    seen.add(cur.id);
    cur = getGeneric(cur.parentId);
  }
  return undefined;
}

export function iconForGeneric(id: string | undefined): string | undefined {
  const g = getGeneric(id);
  return g ? inherited(g, 'icon') : undefined;
}

/** STORE_BRAND_MAP key for a generic, inherited from the parent. Lets all
 *  `joghurt` variants borrow the `joghurt` own-brand suggestions. */
export function brandKeyForGeneric(id: string | undefined): string | undefined {
  const g = getGeneric(id);
  return g ? inherited(g, 'brandKey') : undefined;
}

/** Direct + transitive variant generics of `id` (children, grandchildren …),
 *  in registry order. */
export function variantsOf(id: string): Generic[] {
  const out: Generic[] = [];
  const stack = [id];
  while (stack.length) {
    const parent = stack.shift()!;
    for (const g of GENERICS) {
      if (g.parentId === parent) {
        out.push(g);
        stack.push(g.id);
      }
    }
  }
  return out;
}

interface MatchString {
  generic: Generic;
  /** Token count of the match string — higher = more specific, wins ties. */
  tokens: number;
  spaced: string; // normalized, space-separated
  joined: string; // normalized, no spaces
}

/** Flattened (name + aliases) → generic index, longest (most specific) first. */
const MATCH_INDEX: MatchString[] = (() => {
  const out: MatchString[] = [];
  for (const g of GENERICS) {
    for (const raw of [g.name, ...(g.aliases ?? [])]) {
      const spaced = norm(raw);
      if (!spaced) continue;
      out.push({ generic: g, tokens: spaced.split(' ').length, spaced, joined: spaced.replace(/ /g, '') });
    }
  }
  // Most specific first so "griechischer joghurt" beats bare "joghurt".
  return out.sort((a, b) => b.tokens - a.tokens || b.joined.length - a.joined.length);
})();

/**
 * Map an arbitrary product/typed name to a generic id, or `null`. Optionally
 * biased toward `category` to disambiguate (e.g. "creme" in koerperpflege).
 *
 * Strategy, in order:
 *   1. exact — query equals a match string (spaced or joined form),
 *   2. contained — every token of a match string appears in the query
 *      (so "Landliebe Griechischer Joghurt" → griechischer-joghurt).
 * Within each tier the most specific (most tokens, then longest) wins, with a
 * tie-break toward the category-matching candidate.
 */
export function resolveGeneric(name: string, category?: Category): string | null {
  const q = norm(name);
  if (!q) return null;
  const qTokens = new Set(q.split(' '));
  const qJoined = q.replace(/ /g, '');

  const better = (a: MatchString, b: MatchString | null): boolean => {
    if (!b) return true;
    const aCat = category != null && a.generic.category === category ? 1 : 0;
    const bCat = category != null && b.generic.category === category ? 1 : 0;
    if (a.tokens !== b.tokens) return a.tokens > b.tokens;
    if (aCat !== bCat) return aCat > bCat;
    return a.joined.length > b.joined.length;
  };

  let exact: MatchString | null = null;
  let contained: MatchString | null = null;

  for (const m of MATCH_INDEX) {
    if (m.spaced === q || m.joined === qJoined) {
      if (better(m, exact)) exact = m;
      continue;
    }
    // Every token of the (multi-word) match string present in the query.
    const mTokens = m.spaced.split(' ');
    if (mTokens.every((t) => qTokens.has(t)) && better(m, contained)) {
      contained = m;
    }
  }

  return (exact ?? contained)?.generic.id ?? null;
}

const STORES_BY_CATEGORY_CACHE = new Map<Category, Store[]>();
function storesForCategory(c: Category): Store[] {
  let s = STORES_BY_CATEGORY_CACHE.get(c);
  if (!s) {
    s = defaultStoresForCategory(c);
    STORES_BY_CATEGORY_CACHE.set(c, s);
  }
  return s;
}

/**
 * Synthesize a {@link Product} from a generic so it can flow through the normal
 * add path. id is `generic:<id>` so it's distinguishable from barcode SKUs and
 * `local:` catalog rows. `addItemFromProduct` re-derives stores anyway; we seed
 * them here for correct suggestion display.
 */
export function genericToProduct(g: Generic): Product {
  return {
    id: `generic:${g.id}`,
    name: g.name,
    category: g.category,
    icon: inherited(g, 'icon'),
    stores: storesForCategory(g.category),
    genericId: g.id,
  };
}

/**
 * Rank generics for the autocomplete. exact → prefix → token-subset → alias
 * contains, capped at `limit`. Variants are intentionally included so typing
 * "quark" surfaces Speisequark 20%/40%/Magerstufe even when no catalog SKU or
 * OFF product exists for them.
 */
export function searchGenerics(query: string, limit = 8): Generic[] {
  const q = norm(query);
  if (!q) return [];
  const qTokens = q.split(' ').filter(Boolean);
  const qJoined = qTokens.join('');

  const exact: Generic[] = [];
  const prefix: Generic[] = [];
  const token: Generic[] = [];
  const seen = new Set<string>();

  const push = (bucket: Generic[], g: Generic) => {
    if (seen.has(g.id)) return;
    seen.add(g.id);
    bucket.push(g);
  };

  for (const m of MATCH_INDEX) {
    const g = m.generic;
    if (seen.has(g.id)) continue;
    if (m.spaced === q || m.joined === qJoined) push(exact, g);
    else if (m.spaced.startsWith(q) || m.joined.startsWith(qJoined)) push(prefix, g);
    else if (qTokens.every((t) => m.joined.includes(t))) push(token, g);
  }

  return [...exact, ...prefix, ...token].slice(0, limit);
}
