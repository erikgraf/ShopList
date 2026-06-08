/**
 * Offers — runtime client for the /api/offers KV blob.
 *
 * The Worker exposes a single key (`offers:current`) populated weekly by the
 * Phase-1 fetchers (Aldi/DM/Netto/Rewe-stub/Lidl-stub, see worker/offers.ts).
 * The shape on the wire is what `scripts/run-offers.ts` emits:
 *   { generated_at, total, by_store, offers: Offer[] }
 *
 * This module: fetches once at app start, caches in memory + localStorage with
 * a 1 h TTL, and provides `matchItemToOffer(item, offers, tier)` which the
 * filter pipeline calls to populate `item.offer` (= best discount_pct under
 * the selected tier) before `applyFilter` runs.
 */
import { useEffect, useState } from 'react';
import type { Item } from './types';
import type { OffersTier } from './facets';

export interface Offer {
  store: string;
  name: string;
  brand?: string;
  ean?: string;
  price?: number;
  was_price?: number;
  /** Negative integer when discounted (-20, -15, …). The UI flips the sign
   *  for the badge. Absent when the chain doesn't surface a strikethrough. */
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
  // Cache hit?
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const { at, blob } = JSON.parse(raw) as { at: number; blob: OffersBlob };
      if (Date.now() - at < CACHE_TTL_MS) return blob;
    }
  } catch {
    // localStorage unreachable (Safari private mode etc.) — silently fall
    // through to network.
  }
  // Network. Same-origin so no CORS issue.
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

/** Tiny React hook: fetches /api/offers once at mount, returns the blob. */
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

const stripDiacritics = (s: string): string =>
  s
    .toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * For a single item, find the best matching offer at the chosen tier. Returns
 * the negative discount_pct of the best match (smallest number, i.e. biggest
 * discount), or undefined if no match.
 */
export function bestOfferForItem(
  item: Item,
  offers: Offer[],
  tier: OffersTier | null,
): number | undefined {
  if (!tier || offers.length === 0) return undefined;

  const itemBrand = item.brand ? stripDiacritics(item.brand) : '';
  const itemName  = stripDiacritics(item.name);

  let best: number | undefined;
  for (const o of offers) {
    let hit = false;
    switch (tier) {
      case 'marken':
        // exact: EAN / barcode match, or brand match with a name-token overlap
        if (item.barcode && o.ean && o.ean === item.barcode) hit = true;
        else if (
          itemBrand &&
          o.brand &&
          stripDiacritics(o.brand).includes(itemBrand) &&
          itemName.split(' ').some((tok) => tok.length > 3 && stripDiacritics(o.name).includes(tok))
        ) hit = true;
        break;
      case 'produkte':
        hit = !!(item.taxonomyL3 && o.taxonomy_l3 && o.taxonomy_l3 === item.taxonomyL3);
        break;
      case 'kategorien':
        hit = !!(item.taxonomyL2 && o.taxonomy_l2 && o.taxonomy_l2 === item.taxonomyL2);
        break;
      case 'alle':
        // Loose: any offer in the same ShopList Category, or any offer at all
        // when neither carries one. Avoids matching toilet paper to bananas
        // when the data IS rich enough to distinguish.
        if (o.category && o.category === item.category) hit = true;
        else if (!o.category) hit = true;
        break;
    }
    if (!hit) continue;
    const d = o.discount_pct ?? 0;
    if (best === undefined || d < best) best = d;
  }
  return best;
}

/** Returns a NEW items array with `item.offer` set per the tier-based match.
 *  Items with no match keep their existing `offer` (which is usually
 *  undefined since we don't persist auto-derived discounts). */
export function enrichItemsWithOffers(
  items: Item[],
  offers: Offer[],
  tier: OffersTier | null,
): Item[] {
  if (!tier) return items;
  return items.map((it) => {
    const d = bestOfferForItem(it, offers, tier);
    if (d === undefined) return it;
    return { ...it, offer: -d /* badge wants positive percent */ };
  });
}
