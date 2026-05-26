import type { Store } from './types';
import { STORE_BRAND_MAP as STORE_BRAND_MAP_DATA, KEY_LABELS as KEY_LABELS_DATA } from './data';

/**
 * Curated mapping of common shopping-list items to each chain's own brand.
 * Powers the per-store brand suggestion engine: when the user filters to DM
 * and hasn't picked a brand yet for "Handcreme", we surface "Balea"; switching
 * to Aldi flips it to "Lacura". This is the cheapest practical path to
 * Aldi-vs-DM-aware suggestions — Open Food Facts has rich brand data for
 * groceries but Open Beauty Facts is sparse for drugstore staples, so the
 * grocery-chain and drugstore store brands here are encoded by hand.
 *
 * Each entry has:
 *   - `default`: the chain's everyday own-brand for this category
 *   - `bio` (optional): the chain's organic/natural variant, used when the
 *     user has flipped the Bio preference on
 */

export interface StoreBrandEntry {
  default: Partial<Record<Store, string>>;
  bio?: Partial<Record<Store, string>>;
}

/** Drugstore store brands (Aldi/Lidl carry many of these as private-label too). */

/** Bio cosmetics lines: dmBio/Alverde at DM, Alterra at Rossmann, GUT BIO at
 *  Aldi etc. — the discounters' bio range covers cosmetics under a single name. */

/** Grocery house brands — these match the chain's everyday cheapest tier. */

/**
 * Grocery bio lines — supermarket chains only. dm (dmBio) and Rossmann
 * (enerBio) are deliberately excluded: this map feeds `availableStores`,
 * and including the drugstores made every grocery staple (Eier, Brot,
 * Milch, …) show up under the dm/Rossmann store filters even though those
 * chains don't carry fresh eggs, bread, meat, etc. Drugstore-bio coverage
 * is too item-specific to model with a blanket grocery-bio map, so it's
 * left out; dm/Rossmann still come in for the items that genuinely belong
 * there via their own STORE_BRAND_MAP entries (toiletries, household).
 */

/**
 * Keys are lowercase substrings of item names. `matchItemKey` does a simple
 * `includes` match against the normalised item name, so "Hand- & Nagelcreme"
 * still hits "handcreme". Longer/more specific keys come first so e.g.
 * "trockenshampoo" wins over "shampoo".
 */
export const STORE_BRAND_MAP = STORE_BRAND_MAP_DATA;

/**
 * Resolve an item name to a STORE_BRAND_MAP key. Longer keys win first so a
 * "Trockenshampoo" hits its own entry instead of matching plain "shampoo".
 * Diacritics are stripped so "Käse" matches "kaese".
 */
const SORTED_KEYS = Object.keys(STORE_BRAND_MAP).sort((a, b) => b.length - a.length);

export function matchItemKey(name: string): string | null {
  const lower = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ß/g, 'ss');
  for (const key of SORTED_KEYS) {
    if (lower.includes(key)) return key;
  }
  return null;
}

/**
 * Display labels for each STORE_BRAND_MAP key. Used to clean up wordy
 * Open-Food-Facts product names into a single generic noun on the item row.
 * Example: `Kamill Hand- & Nagelcreme classic` becomes `Handcreme` because
 * `matchItemKey` resolves to `handcreme` and `KEY_LABELS.handcreme` is
 * `"Handcreme"`. The brand stays separately on the right.
 */
export const KEY_LABELS = KEY_LABELS_DATA;

/**
 * Return a clean generic name if the raw product name matches a known
 * category key, otherwise return the raw name unchanged. Only called from
 * the barcode-scan add path — typed-or-searched items keep their literal
 * name because the user typed exactly what they wanted.
 */
export function genericName(rawName: string): string {
  const trimmed = rawName.trim();
  const key = matchItemKey(trimmed);
  if (!key || !KEY_LABELS[key]) return trimmed;
  // A single clean word is already the name the user wants, whether the
  // bare noun ("Saft") or a compound built on the key ("Orangensaft").
  if (!/\s/.test(trimmed)) return trimmed;
  // Multi-word (typically a scanned OFF name: brand + product + pack size,
  // e.g. "Ferrero Milchschnitte 10er Pack"). If any single word is a richer
  // compound built on the key — "Milchschnitte"/"Vollmilch" on `milch`,
  // "Orangensaft" on `saft` — keep that word; collapsing to the bare label
  // ("Milch") throws away the product. Otherwise (the name only carries the
  // bare noun amid brand/filler words) fall back to the clean base label.
  const norm = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/ß/g, 'ss');
  for (const word of trimmed.split(/\s+/)) {
    const n = norm(word);
    if (n.length > key.length && n.includes(key) && /\p{L}/u.test(word)) return word;
  }
  return KEY_LABELS[key];
}

/**
 * Union of the chains the user can buy this item at: everything we have
 * a brand-map entry for at the item's generic name, plus whatever the
 * caller already had (catalog data, defaultStoresForCategory, etc.).
 * Centralises the rule that "if Lacura sells Handcreme at Aldi and Balea
 * sells Handcreme at DM, the Handcreme item belongs in both store filters
 * regardless of which one the user happens to have pinned a brand for".
 */
export function availableStores(name: string, fallback: Store[]): Store[] {
  const stores = new Set<Store>(fallback);
  const key = matchItemKey(name);
  if (key) {
    const entry = STORE_BRAND_MAP[key];
    if (entry) {
      for (const s of Object.keys(entry.default) as Store[]) stores.add(s);
      if (entry.bio) for (const s of Object.keys(entry.bio) as Store[]) stores.add(s);
    }
  }
  return [...stores];
}

export interface Preferences {
  preferBio: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = { preferBio: false };

export interface Suggestion {
  brand: string;
  reason: 'bio' | 'store';
}

/**
 * Pick a brand to suggest for (item name, store) under the given preferences.
 * Returns `null` if we have no data for this category at this store. Bio is
 * tried first when the preference is on and a bio entry exists for the store;
 * otherwise we fall through to the chain's everyday own-brand.
 */
export function suggestBrand(name: string, store: Store, prefs: Preferences): Suggestion | null {
  const key = matchItemKey(name);
  if (!key) return null;
  const entry = STORE_BRAND_MAP[key];
  if (!entry) return null;
  if (prefs.preferBio && entry.bio?.[store]) {
    return { brand: entry.bio[store]!, reason: 'bio' };
  }
  if (entry.default[store]) {
    return { brand: entry.default[store]!, reason: 'store' };
  }
  return null;
}

/**
 * Return all known own-brand options for this item across stores — used by
 * BrandSheet to surface chain-specific picks in addition to whatever the
 * Open Food Facts snapshot has scraped for this product name.
 */
export function suggestionsForName(name: string, prefs: Preferences): Array<{ store: Store; brand: string; reason: Suggestion['reason'] }> {
  const key = matchItemKey(name);
  if (!key) return [];
  const entry = STORE_BRAND_MAP[key];
  if (!entry) return [];
  const out: Array<{ store: Store; brand: string; reason: Suggestion['reason'] }> = [];
  const stores: Store[] = ['aldi', 'lidl', 'rewe', 'edeka', 'dm', 'rossmann'];
  for (const s of stores) {
    if (prefs.preferBio && entry.bio?.[s]) {
      out.push({ store: s, brand: entry.bio[s]!, reason: 'bio' });
    } else if (entry.default[s]) {
      out.push({ store: s, brand: entry.default[s]!, reason: 'store' });
    }
  }
  return out;
}
