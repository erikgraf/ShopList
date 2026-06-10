/**
 * Offers — runtime client for the /api/offers KV blob.
 *
 * The Worker exposes a single key (`offers:current`) populated weekly by
 * `scripts/run-offers.ts --write` (Aldi/DM/Netto fetchers live in
 * worker/offers.ts). The shape on the wire:
 *   { generated_at, total, by_store, offers: Offer[] }
 *
 * Three jobs:
 *  - `useOffers()` fetches once at app start, caches in localStorage with a
 *    1 h TTL, and falls back to the stale cache when offline / the endpoint
 *    is briefly empty.
 *  - `doesOfferMatchHistory(offer, history, tier)` — the tier predicate the
 *    Angebote view filters the feed with.
 *  - `attachOfferMeta(items, offers)` — Marken-tier join that stamps the
 *    row-badge fields (offer / offerStore / offerPrice / offerSavings) onto
 *    the user's items each render. Live matches override; expired persisted
 *    snapshots (see Item.offerValidUntil) are hidden.
 */
import { useEffect, useState } from 'react';
import type { Category, Item } from './types';
import type { OffersTier } from './facets';
import { resolveMatchKey } from './offer-match';

/** Minimum shape needed to match an offer against. Both `Item` (a row on a
 *  shopping list) and `RecentProduct` (something the user has previously
 *  added / searched / bought) satisfy this — and the Meine % filter uses
 *  the *RecentProduct* set so matches reflect long-term taste rather than
 *  whatever happens to be on the list this minute. */
export interface OfferMatchKey {
  barcode?: string;
  brand?: string;
  name: string;
  genericName?: string;
  category?: Category;
  taxonomyL3?: string;
  taxonomyL2?: string;
}

export interface Offer {
  store: string;
  name: string;
  brand?: string;
  ean?: string;
  price?: number;
  was_price?: number;
  /** Negative integer when discounted (-20, -15, …). UI flips the sign for
   *  the badge. Absent when the chain doesn't surface a strikethrough. */
  discount_pct?: number;
  unit?: string;
  image?: string;
  /** ISO dates bounding the offer's validity. Every offer carries both after
   *  ingest (Netto from its href, ALDI/DM from the Mon–Sat fetch week). */
  valid_from?: string;
  valid_until?: string;
  source_url: string;
  // Enrichment fields populated by the ingest CLI before the blob is stored.
  generic_name?: string;
  taxonomy_l3?: string;
  taxonomy_l2?: string;
  category?: string;
}

interface OffersBlob {
  generated_at: string | null;
  total: number;
  by_store?: Record<string, number>;
  offers: Offer[];
}

const CACHE_KEY = 'offers:cache:v1';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 h
const EMPTY: OffersBlob = { generated_at: null, total: 0, offers: [] };

async function fetchOffers(): Promise<OffersBlob> {
  // Read whatever is cached first — a FRESH non-empty blob short-circuits;
  // anything else is kept as the stale fallback for the failure paths below.
  // Never short-circuit on a cached EMPTY blob: that pins "no offers" for an
  // hour when the app was opened moments before a weekly ingest landed.
  let stale: OffersBlob | null = null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const { at, blob } = JSON.parse(raw) as { at: number; blob: OffersBlob };
      if (blob && Array.isArray(blob.offers)) {
        if (blob.total > 0 && Date.now() - at < CACHE_TTL_MS) return blob;
        if (blob.total > 0) stale = blob;
      }
    }
  } catch {
    // localStorage unreachable (Safari private mode etc.) — fall through to network.
  }
  try {
    const res = await fetch('/api/offers', { cache: 'no-store' });
    if (!res.ok) return stale ?? EMPTY;
    const blob = (await res.json()) as OffersBlob;
    if (blob.total > 0) {
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), blob }));
      } catch {
        // quota / not-available — non-fatal
      }
      return blob;
    }
    // Endpoint answered but with the empty default (KV between ingests).
    // Last week's offers beat a blank view — Mon–Sa prices barely move.
    return stale ?? blob;
  } catch {
    // Offline / network error: a stale cache (even past its TTL) beats EMPTY.
    return stale ?? EMPTY;
  }
}

/** Fetch /api/offers on mount; return the blob. */
export function useOffers(): OffersBlob {
  const [blob, setBlob] = useState<OffersBlob>(EMPTY);
  useEffect(() => {
    let cancelled = false;
    fetchOffers().then((b) => {
      if (!cancelled) setBlob(b);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return blob;
}

/** Normalise a string for keyword/match comparison. Uses the standard German
 *  transliteration (ae/oe/ue/ss) rather than collapsing umlauts to plain
 *  vowels, because all CATEGORY_KEYWORDS + downstream brand/name matchers
 *  read more naturally in that form ("haehnchen", "kaese", "muesli"). Both
 *  sides of every comparison go through this, so the choice is symmetric. */
export const stripDiacritics = (s: string): string =>
  s
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');

// Single source of truth for "is this a real Category slug?"
const CATEGORY_BUCKETS: Record<Category, true> = {
  'obst-gemuese': true, 'brot-gebaeck': true, 'milch-eier': true, 'fleisch-fisch': true,
  tiefkuehl: true, vorrat: true, 'gewuerze-saucen': true, 'fruehstueck-aufstrich': true,
  'suesses-knabberei': true, getraenke: true, koerperpflege: true, haushalt: true,
  baby: true, sonstiges: true,
};

/**
 * Keyword rules for categorising offers by name. Order matters — more specific
 * rules first, because the haystack is just lowercased + diacritic-stripped
 * `name + brand` and many German words straddle categories ("Creme" appears in
 * both koerperpflege and milch-eier-adjacent contexts). The rules are
 * intentionally surface-level — better to miss than to mis-bucket.
 */
const CATEGORY_KEYWORDS: { cat: Category; kw: RegExp }[] = [
  // Drugstore / household / baby — strongly bounded, no false positives from
  // food words.
  // No bare `creme` here: "Crème fraîche" and "Nuss-Nougat-Creme" are food.
  // Only cosmetics compounds count (the haystack is transliterated, so
  // fusscreme covers Fußcreme).
  { cat: 'koerperpflege', kw: /\b(shampoo|duschgel|seife|deo(?:dorant)?|zahn(?:pasta|bürste|buerste)?|hautcreme|handcreme|gesichtscreme|sonnencreme|tagescreme|nachtcreme|rasiercreme|fusscreme|bodylotion|lotion|rasur|tampon|binde|maske|lidschatten|kajal|eyeliner|brow|augenbrauen|lippenstift|nagellack|mascara|wimpern|haarspray|haarpflege|mundwasser)\b/ },
  { cat: 'haushalt',      kw: /\b(spuelmittel|wasch(?:mittel|pulver)?|weichspueler|reiniger|toilettenpapier|klopapier|kuechenroll|muellbeutel|geschirr|allzweck|duftlicht(?:er)?|teelicht(?:er)?|kerze(?:n|nhalter)?|profissimo|vase|korb|speiseteller|dekoration|deko|servietten)\b/ },
  { cat: 'baby',          kw: /\b(baby|windel|pampers|saeugling|kleinkind)\b/ },
  // Strongly specific food signals — these win against everything else when
  // present (frozen-foods names, meat cuts, fishstick brands, …).
  { cat: 'tiefkuehl',     kw: /\b(tiefkuehl|tk|gefroren|fischstaebchen|eiscreme|pommes|pizza)\b/ },
  // Drop \b: compound German words ("Schnitzelsortiment", "Bauernbratwurst",
  // "Bruzzlkracher") are common and \b would block them. Distinct enough that
  // substring matching here is safe.
  { cat: 'fleisch-fisch', kw: /(schnitzel|wurst|bratwurst|salami|schinken|haehnchen|gefluegel|rind|schwein|hack|lachs|fisch|garnele|filet|gulasch|ente|pute|truthahn|frikadelle|metzgerei|bbq|spiess|bauchfleisch|minutensteak|bruzzl|kotelett|cabanossi|cevapcici)/ },
  // Frühstück runs BEFORE milch-eier and suesses so "Müsli-Riegel … Milch
  // Classic" lands in Frühstück (the Müsli signal trumps the "Milch" mention).
  { cat: 'fruehstueck-aufstrich', kw: /\b(muesli|cornflakes|fruehstueck|marmelade|honig|aufstrich|nutella|hagelzucker|porridge|haferflocken|haferbrei|brotaufstrich)\b/ },
  // Süßes BEFORE obst-gemuese so "Schokolade 100 g, Erdbeere" doesn't end up
  // under fruit. "Schokolade" / "Schoko" is the primary signal, not the flavour.
  // Note: drop `\b` on the compound-word fragments (chips, riegel, cake, …)
  // so German Komposita like "Stapelchips" / "Müsli-Riegel" / "Soft Cake" /
  // "Jaffa Cake" match through. Brands carry the rest (Haribo, Knoppers).
  { cat: 'suesses-knabberei', kw: /(schokolade|schoko|bonbon|gummibaer|chips|flips|cracker|riegel|knoppers|cashew|nuss|nuesse?|nougat|mandel|popcorn|kekse|kuchen|gebaeck|salzstange|pringles|snickers|mars|kitkat|hanuta|duplo|haribo|cake|jaffa|softcake|biscotto|biscoff|lakritz|kinderschokolade|milka|oreo|ritter sport|star rice|fruchtkaramelle|knabberbox|knabber|crisp)/ },
  // Dairy is broad on purpose — anything with "joghurt" / "milch" / "kaese"
  // / "schmand" is dairy regardless of flavour. Sweets above have already
  // siphoned off the Schoko-Joghurts that shelve with snacks at ALDI.
  { cat: 'milch-eier',    kw: /\b(milch|joghurt|jogurt|quark|kaese|butter|sahne|schmand|creme fraiche|frischkaese|mozzarella|gouda|eier?)\b/ },
  { cat: 'brot-gebaeck',  kw: /\b(brot|broetchen|toast|vollkorn|baguette|fladen|knaecke|brezel|laugen)\b/ },
  // Drinks BEFORE obst-gemuese — "Apfelsaft" / "Orangensaft" / "Fanta Mango"
  // carry a fruit name but the product is the drink. `saft|tee|getraenk|...`
  // are compound suffixes so we drop the trailing `\b`. The "% vol" / "vol"
  // alcohol-content marker is the single strongest signal for any spirit /
  // wine / liqueur — that catches the long tail of vinhos, Bordeaux, etc.
  // even when no grape varietal is in the keyword list.
  // Drinks rule. Short tokens (`gin`, `tee`, `rum`) are wrapped in `\b…\b`
  // so they don't substring-match into "auBERGINe", "salaTEE", "burRUMher"
  // and so on. Longer / distinctive tokens stay loose to catch compound
  // forms like "Apfelschorle", "Bag-in-Box", "0,75 Liter".
  { cat: 'getraenke',     kw: /(wasser|saft|cola|fanta|sprite|bier|wein|sekt|limo|kaffee|espresso|kakao|smoothie|getraenk|mineralwasser|brause|schorle|eistee|pfanner|sirup|vodka|secco|prosecco|spritz|sprizz|aperitivo|aperitif|schnaps|whisky|liqueur|likoer|chardonnay|merlot|riesling|pinot|primitivo|grigio|sauvignon|rouge|rosato|moscato|bacardi|martini|veltliner|melitta|coffeeb|bag in box|0,75 liter|0,7 liter|0,75l|% vol|drink)|\b(gin|rum|tee|rose)\b/ },
  // Obst & Gemüse runs LAST among the food rules — by now anything that's
  // really a drink, sweet, dairy or meat with a fruit-flavour suffix has
  // already been claimed. Drop `\b` so compound forms like
  // "Cherryrispentomaten", "Mini-Gurken", "Speisefrühkartoffeln",
  // "Plattpfirsiche" match.
  { cat: 'obst-gemuese',  kw: /(apfel|aepfel|birne|tomate|salat|gurke|paprika|zwiebel|kartoffel|drilling|avocado|aubergine|banane|kiwi|trauben|pfirsich|aprikose|kirsche|melone|mango|ananas|knoblauch|moehre|rote bete|spinat|brokkoli|blumenkohl|pilz|champignon|eisberg|kraeuter|frueh(?:kartoffel)?|rispe|beilagensalat|zucchini|kuerbis|rettich|radieschen|fenchel|sellerie|porree|lauch)/ },
  { cat: 'gewuerze-saucen', kw: /\b(senf|ketchup|mayo|mayonnaise|sauce|sosse|dressing|essig|oel|gewuerz|pfeffer|salz|paprikapulver|currypulver|bruehe|maggi|knorr|tomatensosse|pesto)\b/ },
  // No `dose`/`konserve` here — too many drink offers come "im 6er-Pack Dose"
  // and would mis-bucket into vorrat. Pasta, pulses, baking staples only.
  { cat: 'vorrat',        kw: /\b(nudeln|spaghetti|pasta|reis|mehl|zucker|huelsenfruechte|bohnen|linsen|kichererbsen|tomatensosse)\b/ },
];

/**
 * Best-effort ShopList Category for an offer. Priority order:
 *   1. `offer.category` already set (EAN-enriched from the snapshot)
 *   2. Keyword match against the rules above
 *   3. Fallback `sonstiges`
 *
 * Lives in offers.ts because it's only used to bucket the Angebote feed; it's
 * not authoritative enough to drive item categorisation on add.
 */
export function categorizeOffer(offer: Offer): Category {
  if (offer.category && (offer.category as string) in CATEGORY_BUCKETS) {
    return offer.category as Category;
  }
  const hay = stripDiacritics(`${offer.name} ${offer.brand ?? ''}`);
  for (const { cat, kw } of CATEGORY_KEYWORDS) {
    if (kw.test(hay)) return cat;
  }
  return 'sonstiges';
}

/**
 * Stable identity for an offer within one weekly feed. `source_url` alone is
 * NOT unique (Netto offers can share a constant landing URL), so the key
 * folds in ean / name / unit / price. Used for React keys, the
 * lists-per-offer map in the Angebote view, and the synthetic product id
 * when an offer is added to a list.
 */
export function offerKey(o: Offer): string {
  return [o.store, o.ean ?? '', o.name, o.unit ?? '', o.price ?? ''].join('|');
}

/** Monday-of-the-week → Saturday window for the given timestamp. German
 *  chains rotate Mo–Sa, so this is the right shape both for the "Gültig"
 *  stamp in the Angebote header and for `Item.offerValidUntil` at add-time.
 *  Sundays round forward to the next Monday. */
export function weeklyOfferRange(generatedAt: string | null): { from: Date; to: Date } | null {
  if (!generatedAt) return null;
  const at = new Date(generatedAt);
  if (Number.isNaN(at.getTime())) return null;
  const day = at.getDay(); // 0 = Sun, 1 = Mon, …, 6 = Sat
  const mondayDelta = day === 0 ? 1 : 1 - day;
  const from = new Date(at);
  from.setDate(at.getDate() + mondayDelta);
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(from.getDate() + 5);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

/** "09. – 14. Jun" when from + to share a month, else "29. Mai – 03. Jun". */
export function formatRange(from: Date, to: Date): string {
  const dayMonth = (d: Date) => d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  const sameMonthSameYear =
    from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  if (sameMonthSameYear) {
    return `${String(from.getDate()).padStart(2, '0')}. – ${dayMonth(to)}`;
  }
  return `${dayMonth(from)} – ${dayMonth(to)}`;
}

/** Per-offer "Gültig 08. – 13. Jun" from the offer's ISO validity strings.
 *  Returns null when neither date is set. Handles a missing endpoint by
 *  showing the one we have ("bis 13. Jun" / "ab 08. Jun"). */
export function offerValidityLabel(o: {
  valid_from?: string;
  valid_until?: string;
}): string | null {
  const parse = (s?: string): Date | null => {
    if (!s) return null;
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  };
  const from = parse(o.valid_from);
  const to = parse(o.valid_until);
  if (from && to) return formatRange(from, to);
  const dayMonth = (d: Date) => d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  if (to) return `bis ${dayMonth(to)}`;
  if (from) return `ab ${dayMonth(from)}`;
  return null;
}

/**
 * For each item, find the best DISCOUNTED offer of the SAME PRODUCT TYPE
 * (produkte tier — the managed synonym match, so "Tomaten" on the list lights
 * up with a "Cherryrispentomaten" deal) and return a NEW items array with the
 * full badge quartet stamped: offer (positive percent), offerStore,
 * offerPrice, offerSavings — always all four from the SAME offer.
 *
 * Deepest discount wins. Non-discounted feed entries (DM's search results
 * include regular-price products) never badge a row.
 *
 * Items with no live match keep their persisted add-time snapshot while
 * `offerValidUntil` is in the future; expired or legacy (no validity)
 * snapshots are hidden by clearing the fields on the transient copy — Dexie
 * keeps the stale values harmlessly.
 */
export function attachOfferMeta(items: Item[], offers: Offer[]): Item[] {
  const now = Date.now();
  return items.map((it) => {
    const single = [it];
    let best: Offer | undefined;
    for (const o of offers) {
      if (o.discount_pct === undefined || o.discount_pct >= 0) continue;
      // Same product type (Tomaten ↔ Cherryrispentomaten) OR exact identity
      // (a scanned item whose barcode equals the offer's EAN, even when the
      // name doesn't resolve to a synonym key).
      if (!doesOfferMatchHistory(o, single, 'produkte') && !doesOfferMatchHistory(o, single, 'marken'))
        continue;
      if (!best || o.discount_pct < (best.discount_pct as number)) best = o;
    }
    if (best) {
      const savings =
        best.was_price !== undefined && best.price !== undefined && best.was_price > best.price
          ? Math.round((best.was_price - best.price) * 100) / 100
          : undefined;
      return {
        ...it,
        offer: -(best.discount_pct as number),
        offerStore: best.store,
        offerPrice: best.price,
        offerSavings: savings,
      };
    }
    // No live match — show the persisted add-time snapshot only while valid.
    if (it.offer !== undefined && it.offerValidUntil !== undefined && it.offerValidUntil > now) {
      return it;
    }
    if (it.offer !== undefined || it.offerStore !== undefined) {
      return {
        ...it,
        offer: undefined,
        offerStore: undefined,
        offerPrice: undefined,
        offerSavings: undefined,
      };
    }
    return it;
  });
}

/** Canonical product key for a list entry — genericName+name (genericName
 *  first so "Lieler" resolves via its OFF generic "Mineralwasser"), scoped
 *  to the ITEM's category: a Süßes item can only resolve to Süßes keys, so
 *  Haribo "Erdbeeren" never resolves to the fruit key. Memoised inside
 *  resolveMatchKey. */
function entryMatchKey(p: OfferMatchKey): string | null {
  return resolveMatchKey(p.genericName ? `${p.genericName} ${p.name}` : p.name, p.category);
}

/** Canonical product key for an offer, scoped to the offer's category
 *  (EAN-enriched when present, else the keyword bucketing). */
function offerMatchKey(o: Offer): string | null {
  return resolveMatchKey(o.name, o.category ?? categorizeOffer(o));
}

/**
 * Does this offer fit the user's *shopping history* under the given tier?
 *
 *   alle       — always yes (browse mode)
 *   marken     — exact: EAN / barcode OR same brand + same product type
 *   produkte   — SAME PRODUCT TYPE via the managed synonym key, regardless of
 *                brand: "Tomaten" ↔ "Cherryrispentomaten", "Sprudel Lieler" ↔
 *                "Mineralwasser Gerolsteiner". (data/offer-synonyms.csv)
 *   kategorien — same ShopList category umbrella (Bier, Wein → Getränke)
 *
 * `history` is the union of past purchases (useRecent) and items on any
 * list; attachOfferMeta and the Angebote list-chips also call it with
 * single-item arrays.
 */
export function doesOfferMatchHistory(
  offer: Offer,
  history: OfferMatchKey[],
  tier: OffersTier,
): boolean {
  if (tier === 'alle') return true;

  if (tier === 'kategorien') {
    const cat = offer.category ?? categorizeOffer(offer);
    return history.some((p) => p.category === cat);
  }

  if (tier === 'produkte') {
    const oKey = offerMatchKey(offer);
    if (oKey) {
      // Keys are category-scoped, so equal keys imply the same aisle —
      // Haribo "Erdbeeren" (Süßes) can never equal the fruit key.
      if (history.some((p) => entryMatchKey(p) === oKey)) return true;
    }
    // Fall back to taxonomy equality when both sides happen to carry it.
    return !!offer.taxonomy_l3 && history.some((p) => p.taxonomyL3 === offer.taxonomy_l3);
  }

  // marken — exact identity: same SKU (EAN) or same brand + same product type.
  const offerBrand = offer.brand ? stripDiacritics(offer.brand) : '';
  const oKey = offerMatchKey(offer);
  return history.some((p) => {
    if (offer.ean && p.barcode && offer.ean === p.barcode) return true;
    if (!offerBrand || !p.brand) return false;
    const pastBrand = stripDiacritics(p.brand);
    if (!offerBrand.includes(pastBrand) && !pastBrand.includes(offerBrand)) return false;
    // Brand matches — require the product type to line up too, so "ALDI"
    // own-brand Tomaten and "ALDI" own-brand Schnitzel don't cross-match.
    return !oKey || entryMatchKey(p) === oKey;
  });
}
