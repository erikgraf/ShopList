/**
 * Offers — runtime client for the /api/offers KV blob.
 *
 * The Worker exposes a single key (`offers:current`) populated weekly by the
 * Phase-1 fetchers (Aldi/DM/Netto/Rewe-stub/Lidl-stub, see worker/offers.ts).
 * The shape on the wire is what `scripts/run-offers.ts` emits:
 *   { generated_at, total, by_store, offers: Offer[] }
 *
 * This module: fetches once at app start, caches in memory + localStorage with
 * a 1 h TTL, and provides `doesOfferMatchItems(offer, items, tier)` — the
 * predicate the new Angebote view (OffersView) uses to filter the feed by tier.
 *
 * Note: the old `enrichItemsWithOffers` / `bestOfferForItem` (which stamped
 * `item.offer` on the user's list) is gone — the redesigned UI browses offers
 * directly rather than badging existing list items.
 */
import { useEffect, useState } from 'react';
import type { Category, Item } from './types';
import type { OffersTier } from './facets';

/** Minimum shape needed to match an offer against. Both `Item` (a row on a
 *  shopping list) and `RecentProduct` (something the user has previously
 *  added / searched / bought) satisfy this — and the Meine % filter uses
 *  the *RecentProduct* set so matches reflect long-term taste rather than
 *  whatever happens to be on the list this minute. */
export interface OfferMatchKey {
  barcode?: string;
  brand?: string;
  name: string;
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
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const { at, blob } = JSON.parse(raw) as { at: number; blob: OffersBlob };
      if (Date.now() - at < CACHE_TTL_MS) return blob;
    }
  } catch {
    // localStorage unreachable (Safari private mode etc.) — fall through to network.
  }
  try {
    const res = await fetch('/api/offers', { cache: 'no-store' });
    if (!res.ok) return EMPTY;
    const blob = (await res.json()) as OffersBlob;
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), blob }));
    } catch {
      // quota / not-available — non-fatal
    }
    return blob;
  } catch {
    return EMPTY;
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
  { cat: 'koerperpflege', kw: /\b(shampoo|duschgel|seife|deo(?:dorant)?|zahn(?:pasta|bürste|buerste)?|creme|lotion|rasur|tampon|binde|maske|lidschatten|kajal|eyeliner|brow|augenbrauen|lippenstift|nagellack|mascara|wimpern|haarspray|haarpflege|mundwasser)\b/ },
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
  { cat: 'suesses-knabberei', kw: /(schokolade|schoko|bonbon|gummibaer|chips|flips|cracker|riegel|knoppers|cashew|nuss|nuesse?|mandel|popcorn|kekse|kuchen|gebaeck|salzstange|pringles|snickers|mars|kitkat|hanuta|duplo|haribo|cake|jaffa|softcake|biscotto|biscoff|lakritz|kinderschokolade|milka|oreo|ritter sport|star rice|fruchtkaramelle|knabberbox|knabber|crisp)/ },
  // Dairy is broad on purpose — anything with "joghurt" / "milch" / "kaese"
  // / "schmand" is dairy regardless of flavour. Sweets above have already
  // siphoned off the Schoko-Joghurts that shelve with snacks at ALDI.
  { cat: 'milch-eier',    kw: /\b(milch|joghurt|jogurt|quark|kaese|butter|sahne|schmand|frischkaese|mozzarella|gouda|eier?)\b/ },
  { cat: 'brot-gebaeck',  kw: /\b(brot|broetchen|toast|vollkorn|baguette|fladen|knaecke|brezel|laugen)\b/ },
  // Drinks BEFORE obst-gemuese — "Apfelsaft" / "Orangensaft" / "Fanta Mango"
  // carry a fruit name but the product is the drink. `saft|tee|getraenk|...`
  // are compound suffixes so we drop the trailing `\b`. The "% vol" / "vol"
  // alcohol-content marker is the single strongest signal for any spirit /
  // wine / liqueur — that catches the long tail of vinhos, Bordeaux, etc.
  // even when no grape varietal is in the keyword list.
  { cat: 'getraenke',     kw: /(wasser|saft|cola|fanta|sprite|bier|wein|sekt|limo|tee|kaffee|espresso|kakao|smoothie|getraenk|mineralwasser|brause|schorle|eistee|pfanner|drink|sirup|vodka|secco|prosecco|spritz|sprizz|aperitivo|aperitif|schnaps|gin|whisky|rum|liqueur|likoer|chardonnay|merlot|riesling|pinot|primitivo|grigio|sauvignon|rouge|rose|rosato|moscato|bacardi|martini|veltliner|melitta|coffeeb|% vol|\d+,\d+ % vol|bag in box|0,75 liter|0,7 liter)/ },
  // Obst & Gemüse runs LAST among the food rules — by now anything that's
  // really a drink, sweet, dairy or meat with a fruit-flavour suffix has
  // already been claimed. Drop `\b` so compound forms like
  // "Cherryrispentomaten", "Mini-Gurken", "Speisefrühkartoffeln",
  // "Plattpfirsiche" match.
  { cat: 'obst-gemuese',  kw: /(apfel|aepfel|birne|tomate|salat|gurke|paprika|zwiebel|kartoffel|drilling|avocado|banane|kiwi|trauben|pfirsich|aprikose|kirsche|melone|mango|ananas|knoblauch|moehre|rote bete|spinat|brokkoli|blumenkohl|pilz|champignon|eisberg|kraeuter|frueh(?:kartoffel)?|rispe|beilagensalat)/ },
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
 * Does this offer fit the user's *shopping history* under the given tier?
 *
 *   alle       — always yes (browse mode)
 *   marken     — exact match against anything the user has shopped before:
 *                EAN / barcode OR brand+name overlap
 *   produkte   — offer.taxonomy_l3 matches any past product's taxonomyL3
 *   kategorien — offer.taxonomy_l2 matches any past product's taxonomyL2
 *
 * `history` is normally `useRecent()` — products the user has added,
 * scanned, or searched before. Matching the *current list* would force the
 * user to put something on today's list before any tier could light up;
 * past shoppings reflect long-term taste.
 */
/**
 * For each item, find the best Marken-tier offer (deepest discount wins) and
 * return a NEW items array with `item.offer` (positive discount percent) and
 * `item.offerStore` stamped. Items without a match come through unchanged.
 *
 * Marken-tier only because the badge has to mean "this exact thing is on
 * offer right now" — looser matching belongs in the Angebote view's Produkte
 * / Kategorien tiers, not on the row.
 */
export function attachOfferMeta(items: Item[], offers: Offer[]): Item[] {
  if (offers.length === 0) return items;
  return items.map((it) => {
    let best: Offer | undefined;
    for (const o of offers) {
      if (!doesOfferMatchHistory(o, [it], 'marken')) continue;
      const d = o.discount_pct ?? 0;
      if (!best || d < (best.discount_pct ?? 0)) best = o;
    }
    if (!best) return it;
    const discount =
      best.discount_pct !== undefined && best.discount_pct < 0 ? -best.discount_pct : undefined;
    const savings =
      best.was_price !== undefined && best.price !== undefined && best.was_price > best.price
        ? Math.round((best.was_price - best.price) * 100) / 100
        : undefined;
    return {
      ...it,
      offer: discount ?? it.offer,
      offerStore: best.store,
      offerPrice: best.price,
      offerSavings: savings,
    };
  });
}

export function doesOfferMatchHistory(
  offer: Offer,
  history: OfferMatchKey[],
  tier: OffersTier,
): boolean {
  if (tier === 'alle') return true;
  if (tier === 'produkte') {
    if (!offer.taxonomy_l3) return false;
    return history.some((p) => p.taxonomyL3 === offer.taxonomy_l3);
  }
  if (tier === 'kategorien') {
    if (!offer.taxonomy_l2) return false;
    return history.some((p) => p.taxonomyL2 === offer.taxonomy_l2);
  }
  // marken
  const offerBrand = offer.brand ? stripDiacritics(offer.brand) : '';
  const offerName  = stripDiacritics(offer.name);
  return history.some((p) => {
    if (offer.ean && p.barcode && offer.ean === p.barcode) return true;
    if (!offerBrand || !p.brand) return false;
    const pastBrand = stripDiacritics(p.brand);
    if (!offerBrand.includes(pastBrand) && !pastBrand.includes(offerBrand)) return false;
    const pName = stripDiacritics(p.name);
    return (
      pName.split(' ').some((t) => t.length > 3 && offerName.includes(t)) ||
      offerName.split(' ').some((t) => t.length > 3 && pName.includes(t))
    );
  });
}
