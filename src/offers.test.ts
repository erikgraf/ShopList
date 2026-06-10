import { describe, expect, it } from 'vitest';
import { attachOfferMeta, categorizeOffer, offerKey, type Offer } from './offers';
import type { Item } from './types';

const offer = (over: Partial<Offer>): Offer => ({
  store: 'aldi',
  name: 'Testprodukt',
  source_url: 'https://example.test/x',
  ...over,
});

const item = (over: Partial<Item>): Item =>
  ({
    id: 'i1',
    listId: 'default',
    productId: 'p1',
    name: 'Testprodukt',
    category: 'sonstiges',
    stores: ['aldi'],
    quantity: 1,
    unit: 'Stk',
    checked: false,
    addedAt: 0,
    updatedAt: 0,
    position: 0,
    ...over,
  }) as Item;

describe('categorizeOffer', () => {
  it('keeps Crème fraîche in dairy, not Körperpflege', () => {
    expect(categorizeOffer(offer({ name: 'Crème fraîche 30 %' }))).toBe('milch-eier');
  });

  it('keeps Nuss-Nougat-Creme in sweets', () => {
    expect(categorizeOffer(offer({ name: 'Nuss-Nougat-Creme 400 g' }))).toBe('suesses-knabberei');
  });

  it('still buckets cosmetics cream as Körperpflege', () => {
    expect(categorizeOffer(offer({ name: 'Handcreme classic 75 ml' }))).toBe('koerperpflege');
  });

  it('puts Aubergine in produce, not drinks (no gin substring match)', () => {
    expect(categorizeOffer(offer({ name: 'Aubergine' }))).toBe('obst-gemuese');
  });
});

describe('offerKey', () => {
  it('distinguishes offers that share a constant source_url (Netto)', () => {
    const a = offer({ store: 'netto', name: 'Joghurt', price: 0.59, source_url: 'https://netto.de/angebote/' });
    const b = offer({ store: 'netto', name: 'Bratwurst', price: 1.99, source_url: 'https://netto.de/angebote/' });
    expect(offerKey(a)).not.toBe(offerKey(b));
  });
});

describe('attachOfferMeta', () => {
  const ean = '4001234567890';

  it('never mixes a stale persisted percent with a fresh non-discounted match', () => {
    // Item carries last week's persisted snapshot (−25 % @ €4.95); this
    // week's feed has the same EAN at REGULAR price (no discount_pct).
    const it1 = item({ barcode: ean, offer: 25, offerStore: 'dm', offerPrice: 4.95 });
    const feed = [offer({ store: 'dm', ean, price: 6.45 })];
    const [out] = attachOfferMeta([it1], feed);
    expect(out.offer).toBeUndefined();
    expect(out.offerStore).toBeUndefined();
    expect(out.offerPrice).toBeUndefined();
  });

  it('stamps the full quartet from one discounted match', () => {
    const it1 = item({ barcode: ean });
    const feed = [offer({ store: 'aldi', ean, price: 3.33, was_price: 4.59, discount_pct: -27 })];
    const [out] = attachOfferMeta([it1], feed);
    expect(out.offer).toBe(27);
    expect(out.offerStore).toBe('aldi');
    expect(out.offerPrice).toBe(3.33);
    expect(out.offerSavings).toBe(1.26);
  });

  it('keeps a persisted snapshot while offerValidUntil is in the future', () => {
    const it1 = item({
      offer: 20,
      offerStore: 'aldi',
      offerPrice: 1.99,
      offerValidUntil: Date.now() + 24 * 60 * 60 * 1000,
    });
    const [out] = attachOfferMeta([it1], []);
    expect(out.offer).toBe(20);
    expect(out.offerStore).toBe('aldi');
  });

  it('hides an expired or legacy (no validity) snapshot', () => {
    const expired = item({ id: 'a', offer: 20, offerStore: 'aldi', offerValidUntil: Date.now() - 1000 });
    const legacy = item({ id: 'b', offer: 15, offerStore: 'netto' });
    const [outA, outB] = attachOfferMeta([expired, legacy], []);
    expect(outA.offer).toBeUndefined();
    expect(outA.offerStore).toBeUndefined();
    expect(outB.offer).toBeUndefined();
    expect(outB.offerStore).toBeUndefined();
  });
});
