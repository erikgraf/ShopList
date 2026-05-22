import type { Store } from './types';

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
const DRUGSTORE_DEFAULTS = {
  aldi: 'Lacura',
  lidl: 'Cien',
  rewe: 'REWE Beste Wahl',
  edeka: 'EDEKA',
  dm: 'Balea',
  rossmann: 'Isana',
} satisfies Partial<Record<Store, string>>;

/** Bio cosmetics lines: dmBio/Alverde at DM, Alterra at Rossmann, GUT BIO at
 *  Aldi etc. — the discounters' bio range covers cosmetics under a single name. */
const DRUGSTORE_BIO = {
  aldi: 'GUT BIO',
  lidl: 'Bio',
  rewe: 'REWE Bio',
  edeka: 'EDEKA Bio',
  dm: 'Alverde',
  rossmann: 'Alterra',
} satisfies Partial<Record<Store, string>>;

/** Grocery house brands — these match the chain's everyday cheapest tier. */
const GROCERY_DEFAULTS = {
  aldi: 'Milsani',
  lidl: 'Milbona',
  rewe: 'Ja!',
  edeka: 'Gut & Günstig',
} satisfies Partial<Record<Store, string>>;

/** Grocery bio lines. */
const GROCERY_BIO = {
  aldi: 'GUT BIO',
  lidl: 'Bio',
  rewe: 'REWE Bio',
  edeka: 'EDEKA Bio',
  dm: 'dmBio',
  rossmann: 'enerBio',
} satisfies Partial<Record<Store, string>>;

/**
 * Keys are lowercase substrings of item names. `matchItemKey` does a simple
 * `includes` match against the normalised item name, so "Hand- & Nagelcreme"
 * still hits "handcreme". Longer/more specific keys come first so e.g.
 * "trockenshampoo" wins over "shampoo".
 */
export const STORE_BRAND_MAP: Record<string, StoreBrandEntry> = {
  // --- Drugstore: cosmetics & personal care -----------------------------
  handcreme: { default: DRUGSTORE_DEFAULTS, bio: DRUGSTORE_BIO },
  bodylotion: { default: DRUGSTORE_DEFAULTS, bio: DRUGSTORE_BIO },
  gesichtscreme: { default: DRUGSTORE_DEFAULTS, bio: DRUGSTORE_BIO },
  sonnencreme: {
    default: { aldi: 'Ombia Sun', lidl: 'Cien Sun', rewe: 'REWE Beste Wahl', edeka: 'EDEKA', dm: 'Sundance', rossmann: 'Sun Ozon' },
  },
  trockenshampoo: { default: DRUGSTORE_DEFAULTS },
  shampoo: { default: DRUGSTORE_DEFAULTS, bio: DRUGSTORE_BIO },
  spuelung: { default: DRUGSTORE_DEFAULTS, bio: DRUGSTORE_BIO },
  duschgel: { default: DRUGSTORE_DEFAULTS, bio: DRUGSTORE_BIO },
  zahnpasta: {
    default: { aldi: 'Bevola', lidl: 'Dentalux', rewe: 'REWE Beste Wahl', edeka: 'EDEKA', dm: 'Dontodent', rossmann: 'Perlodent' },
  },
  zahnbuerste: {
    default: { aldi: 'Bevola', lidl: 'Dentalux', dm: 'Dontodent', rossmann: 'Perlodent' },
  },
  mundwasser: {
    default: { aldi: 'Bevola', lidl: 'Dentalux', dm: 'Dontodent', rossmann: 'Perlodent' },
  },
  deo: { default: DRUGSTORE_DEFAULTS, bio: DRUGSTORE_BIO },
  rasierschaum: { default: { aldi: 'Bevola', lidl: 'Cien', dm: 'Balea Men', rossmann: 'Isana Men' } },
  rasierer: { default: { aldi: 'Bevola', lidl: 'Cien', dm: 'Profissimo', rossmann: 'Rubaza' } },
  seife: { default: DRUGSTORE_DEFAULTS, bio: DRUGSTORE_BIO },
  damenbinde: { default: { aldi: 'Sensiva', lidl: 'Siempre', dm: 'Jessa', rossmann: 'Facelle' } },
  tampons: { default: { aldi: 'Sensiva', lidl: 'Siempre', dm: 'Jessa', rossmann: 'Facelle' } },
  taschentuecher: { default: { aldi: 'Saugstark', lidl: 'Floralys', rewe: 'Ja!', edeka: 'Gut & Günstig', dm: 'Sanft & Sicher', rossmann: 'domol' } },
  windel: { default: { aldi: 'Lupilu', lidl: 'Lupilu', rewe: 'Ja!', edeka: 'Gut & Günstig', dm: 'Babylove', rossmann: 'Babydream' } },

  // --- Household / cleaning ---------------------------------------------
  waschmittel: { default: { aldi: 'Tandil', lidl: 'Formil', rewe: 'Ja!', edeka: 'Gut & Günstig', dm: 'Denkmit', rossmann: 'Domol' } },
  weichspueler: { default: { aldi: 'Tandil', lidl: 'Formil', rewe: 'Ja!', edeka: 'Gut & Günstig', dm: 'Denkmit', rossmann: 'Domol' } },
  spuelmittel: { default: { aldi: 'Tandil', lidl: 'W5', rewe: 'Ja!', edeka: 'Gut & Günstig', dm: 'Denkmit', rossmann: 'Domol' } },
  spuelmaschinentabs: { default: { aldi: 'Tandil', lidl: 'W5', rewe: 'Ja!', edeka: 'Gut & Günstig', dm: 'Denkmit', rossmann: 'Domol' } },
  allzweckreiniger: { default: { aldi: 'Tandil', lidl: 'W5', rewe: 'Ja!', edeka: 'Gut & Günstig', dm: 'Denkmit', rossmann: 'Domol' } },
  badreiniger: { default: { aldi: 'Tandil', lidl: 'W5', dm: 'Denkmit', rossmann: 'Domol' } },
  glasreiniger: { default: { aldi: 'Tandil', lidl: 'W5', dm: 'Denkmit', rossmann: 'Domol' } },
  wcreiniger: { default: { aldi: 'Tandil', lidl: 'W5', dm: 'Denkmit', rossmann: 'Domol' } },
  toilettenpapier: { default: { aldi: 'Kokett', lidl: 'Floralys', rewe: 'Ja!', edeka: 'Gut & Günstig', dm: 'Sanft & Sicher', rossmann: 'domol' } },
  klopapier: { default: { aldi: 'Kokett', lidl: 'Floralys', rewe: 'Ja!', edeka: 'Gut & Günstig', dm: 'Sanft & Sicher', rossmann: 'domol' } },
  kuechenrolle: { default: { aldi: 'Wonder', lidl: 'Floralys', rewe: 'Ja!', edeka: 'Gut & Günstig', dm: 'Denkmit', rossmann: 'Domol' } },
  muellbeutel: { default: { aldi: 'Quickpack', lidl: 'Quickpack', rewe: 'Ja!', edeka: 'Gut & Günstig' } },
  alufolie: { default: { aldi: 'Quickpack', lidl: 'Toppits', rewe: 'Ja!', edeka: 'Gut & Günstig' } },
  backpapier: { default: { aldi: 'Quickpack', lidl: 'Toppits', rewe: 'Ja!', edeka: 'Gut & Günstig' } },

  // --- Grocery basics ---------------------------------------------------
  milch: { default: GROCERY_DEFAULTS, bio: GROCERY_BIO },
  butter: { default: GROCERY_DEFAULTS, bio: GROCERY_BIO },
  joghurt: { default: GROCERY_DEFAULTS, bio: GROCERY_BIO },
  kaese: { default: { aldi: 'Hofburger', lidl: 'Milbona', rewe: 'Ja!', edeka: 'Gut & Günstig' }, bio: GROCERY_BIO },
  sahne: { default: GROCERY_DEFAULTS, bio: GROCERY_BIO },
  quark: { default: GROCERY_DEFAULTS, bio: GROCERY_BIO },
  eier: { default: { aldi: 'Eierhof', lidl: 'Pilos', rewe: 'Ja!', edeka: 'Gut & Günstig' }, bio: GROCERY_BIO },
  broetchen: { default: { aldi: 'Goldähren', lidl: 'Grafschafter', rewe: 'Ja!', edeka: 'Gut & Günstig' } },
  brot: { default: { aldi: 'Goldähren', lidl: 'Grafschafter', rewe: 'Ja!', edeka: 'Gut & Günstig' }, bio: GROCERY_BIO },
  toast: { default: { aldi: 'Goldähren', lidl: 'Grafschafter', rewe: 'Ja!', edeka: 'Gut & Günstig' } },
  mehl: { default: { aldi: 'Goldpuder', lidl: 'Belbake', rewe: 'Ja!', edeka: 'Gut & Günstig' }, bio: GROCERY_BIO },
  zucker: { default: { aldi: 'Diamant', lidl: 'Belbake', rewe: 'Ja!', edeka: 'Gut & Günstig' } },
  reis: { default: { aldi: 'Bon Ri', lidl: 'Golden Sun', rewe: 'Ja!', edeka: 'Gut & Günstig' }, bio: GROCERY_BIO },
  nudeln: { default: { aldi: 'Cucina Nobile', lidl: 'Combino', rewe: 'Ja!', edeka: 'Gut & Günstig' }, bio: GROCERY_BIO },
  olivenoel: { default: { aldi: 'Casa Morando', lidl: 'Primadonna', rewe: 'Ja!', edeka: 'Gut & Günstig' }, bio: GROCERY_BIO },
  essig: { default: { aldi: 'Kühne (Aldi)', lidl: 'Vitasia', rewe: 'Ja!', edeka: 'Gut & Günstig' } },
  schokolade: { default: { aldi: 'Choceur', lidl: 'Fin Carré', rewe: 'Ja!', edeka: 'Gut & Günstig' }, bio: GROCERY_BIO },
  kekse: { default: { aldi: 'Biscotto', lidl: 'Sondey', rewe: 'Ja!', edeka: 'Gut & Günstig' } },
  chips: { default: { aldi: 'Snack Day', lidl: 'Snacktastic', rewe: 'Ja!', edeka: 'Gut & Günstig' } },
  gummibaerchen: { default: { aldi: 'Mister Choc', lidl: 'Sugarland', rewe: 'Ja!', edeka: 'Gut & Günstig' } },
  marmelade: { default: { aldi: 'Grandessa', lidl: 'Mariola', rewe: 'Ja!', edeka: 'Gut & Günstig' }, bio: GROCERY_BIO },
  honig: { default: { aldi: 'Bienenhof', lidl: 'Maribel', rewe: 'Ja!', edeka: 'Gut & Günstig' }, bio: GROCERY_BIO },
  kaffee: { default: { aldi: 'Markus Kaffee', lidl: 'Bellarom', rewe: 'Ja!', edeka: 'Gut & Günstig' }, bio: GROCERY_BIO },
  tee: { default: { aldi: 'Westcliff', lidl: 'Lord Nelson', rewe: 'Ja!', edeka: 'Gut & Günstig' }, bio: GROCERY_BIO },

  // --- Drinks -----------------------------------------------------------
  saft: { default: { aldi: 'Rio d’Oro', lidl: 'Solevita', rewe: 'Ja!', edeka: 'Gut & Günstig' }, bio: GROCERY_BIO },
  wasser: { default: { aldi: 'Quellbrunn', lidl: 'Saskia', rewe: 'Erlenhofer', edeka: 'Aqua Culinaris' } },
  mineralwasser: { default: { aldi: 'Quellbrunn', lidl: 'Saskia', rewe: 'Erlenhofer', edeka: 'Aqua Culinaris' } },
  cola: { default: { aldi: 'River Cola', lidl: 'Freeway Cola', rewe: 'Ja!', edeka: 'Gut & Günstig' } },
  limonade: { default: { aldi: 'River', lidl: 'Freeway', rewe: 'Ja!', edeka: 'Gut & Günstig' } },
  bier: { default: { aldi: 'Karlskrone', lidl: 'Perlenbacher', rewe: 'Ja!', edeka: 'Gut & Günstig' } },
  wein: { default: { aldi: 'Vino Verdi', lidl: 'Allini', rewe: 'Ja!', edeka: 'Gut & Günstig' } },
};

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
export const KEY_LABELS: Record<string, string> = {
  handcreme: 'Handcreme',
  bodylotion: 'Bodylotion',
  gesichtscreme: 'Gesichtscreme',
  sonnencreme: 'Sonnencreme',
  trockenshampoo: 'Trockenshampoo',
  shampoo: 'Shampoo',
  spuelung: 'Spülung',
  duschgel: 'Duschgel',
  zahnpasta: 'Zahnpasta',
  zahnbuerste: 'Zahnbürste',
  mundwasser: 'Mundwasser',
  deo: 'Deo',
  rasierschaum: 'Rasierschaum',
  rasierer: 'Rasierer',
  seife: 'Seife',
  damenbinde: 'Damenbinden',
  tampons: 'Tampons',
  taschentuecher: 'Taschentücher',
  windel: 'Windeln',
  waschmittel: 'Waschmittel',
  weichspueler: 'Weichspüler',
  spuelmittel: 'Spülmittel',
  spuelmaschinentabs: 'Spülmaschinentabs',
  allzweckreiniger: 'Allzweckreiniger',
  badreiniger: 'Badreiniger',
  glasreiniger: 'Glasreiniger',
  wcreiniger: 'WC-Reiniger',
  toilettenpapier: 'Toilettenpapier',
  klopapier: 'Klopapier',
  kuechenrolle: 'Küchenrolle',
  muellbeutel: 'Müllbeutel',
  alufolie: 'Alufolie',
  backpapier: 'Backpapier',
  milch: 'Milch',
  butter: 'Butter',
  joghurt: 'Joghurt',
  kaese: 'Käse',
  sahne: 'Sahne',
  quark: 'Quark',
  eier: 'Eier',
  broetchen: 'Brötchen',
  brot: 'Brot',
  toast: 'Toast',
  mehl: 'Mehl',
  zucker: 'Zucker',
  reis: 'Reis',
  nudeln: 'Nudeln',
  olivenoel: 'Olivenöl',
  essig: 'Essig',
  schokolade: 'Schokolade',
  kekse: 'Kekse',
  chips: 'Chips',
  gummibaerchen: 'Gummibärchen',
  marmelade: 'Marmelade',
  honig: 'Honig',
  kaffee: 'Kaffee',
  tee: 'Tee',
  saft: 'Saft',
  wasser: 'Wasser',
  mineralwasser: 'Mineralwasser',
  cola: 'Cola',
  limonade: 'Limonade',
  bier: 'Bier',
  wein: 'Wein',
};

/**
 * Return a clean generic name if the raw product name matches a known
 * category key, otherwise return the raw name unchanged. Only called from
 * the barcode-scan add path — typed-or-searched items keep their literal
 * name because the user typed exactly what they wanted.
 */
export function genericName(rawName: string): string {
  const key = matchItemKey(rawName);
  if (key && KEY_LABELS[key]) return KEY_LABELS[key];
  return rawName;
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
