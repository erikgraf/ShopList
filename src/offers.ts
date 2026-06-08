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
import type { Item } from './types';
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

export const stripDiacritics = (s: string): string =>
  s
    .toLowerCase()
    .replace(/ä/g, 'a').replace(/ö/g, 'o').replace(/ü/g, 'u').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');

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
    return { ...it, offer: discount ?? it.offer, offerStore: best.store };
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
