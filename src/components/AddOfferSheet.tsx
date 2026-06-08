/**
 * AddOfferSheet — confirmation dialog opened by Hinzufügen in OffersView.
 *
 * Bottom sheet: product summary (image · name · brand · store · price), a
 * compact quantity stepper, and a primary "Auf die Liste" CTA that converts
 * the Offer to a Product and calls `addItemFromProduct`. The resulting Item
 * gets `offer = -discount_pct` stamped so the row in the main list shows the
 * −N % badge that ShelfRow already paints.
 */
import { useState } from 'react';
import { addItemFromProduct } from '../store';
import type { Category, Product, Store } from '../types';
import { CATEGORY_LABELS } from '../types';
import type { Offer } from '../offers';

const KNOWN_STORES = new Set<Store>(['aldi', 'lidl', 'rewe', 'edeka', 'dm', 'rossmann']);

function offerToProduct(o: Offer): Product {
  // Cast offer.store to Store only if it's one of the curated 6; otherwise leave
  // `stores` empty so the existing store-pinning logic falls through to the
  // category default. (Netto/Kaufland — coming later — won't be in `Store`
  // until we expand that enum.)
  const stores = KNOWN_STORES.has(o.store as Store) ? [o.store as Store] : undefined;
  const category = (
    o.category && o.category in CATEGORY_LABELS ? o.category : 'sonstiges'
  ) as Category;
  return {
    id: `offer:${o.store}:${o.ean ?? o.source_url}`,
    name: o.name,
    brand: o.brand,
    image: o.image,
    category,
    genericName: o.generic_name,
    taxonomyL3: o.taxonomy_l3,
    taxonomyL2: o.taxonomy_l2,
    barcode: o.ean,
    stores,
  };
}

export function AddOfferSheet({ offer, onClose }: { offer: Offer; onClose: () => void }) {
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const product = offerToProduct(offer);
      const item = await addItemFromProduct(product, { quantity: qty });
      // Stamp the discount percent on the new Item so the row shows the −N %
      // badge straight away (ShelfRow reads from item.offer).
      if (offer.discount_pct !== undefined && offer.discount_pct < 0) {
        const { db } = await import('../db');
        await db.items.put({ ...item, offer: -offer.discount_pct });
      }
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const fmt = (n: number) => n.toFixed(2).replace('.', ',');

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40"
      onClick={onClose}
    >
      <div
        className="rounded-t-3xl bg-[var(--color-surface)] px-4 pb-6 pt-3"
        style={{
          boxShadow: 'var(--shadow-lg)',
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--color-border-strong)]"
          aria-hidden
        />

        <div className="flex items-stretch gap-3">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--color-surface-2)]" aria-hidden>
            {offer.image && (
              <img src={offer.image} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
            <p className="truncate text-[15.5px] font-semibold leading-tight text-[var(--color-text)]">
              {offer.name}
            </p>
            {offer.brand && (
              <p className="truncate text-[12.5px] text-[var(--color-muted)]">{offer.brand}</p>
            )}
            <div className="mt-0.5 flex items-baseline gap-2">
              {offer.price !== undefined && (
                <span className="text-[16px] font-extrabold tabular-nums text-[var(--color-text)]">
                  €{fmt(offer.price)}
                </span>
              )}
              {offer.was_price !== undefined && offer.was_price > (offer.price ?? 0) && (
                <span className="text-[12px] text-[var(--color-muted)] tabular-nums line-through">
                  €{fmt(offer.was_price)}
                </span>
              )}
              {offer.discount_pct !== undefined && offer.discount_pct < 0 && (
                <span
                  className="ml-auto rounded-md px-1.5 py-0.5 text-[11px] font-bold tabular-nums"
                  style={{
                    background: 'var(--color-offer-soft)',
                    color: 'var(--color-offer)',
                  }}
                >
                  {offer.discount_pct}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Quantity stepper */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="Menge verringern"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] text-[var(--color-text)] transition-press active:bg-[var(--color-border)]"
            disabled={qty <= 1}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M5 12h14" />
            </svg>
          </button>
          <span className="min-w-[3.5rem] text-center text-[28px] font-extrabold tabular-nums text-[var(--color-text)]">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => setQty((q) => q + 1)}
            aria-label="Menge erhöhen"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-surface-2)] text-[var(--color-text)] transition-press active:bg-[var(--color-border)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M5 12h14M12 5v14" />
            </svg>
          </button>
        </div>

        {/* Primary action */}
        <button
          type="button"
          onClick={add}
          disabled={busy}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-2xl bg-[var(--color-accent)] text-base font-bold text-white transition-press active:bg-[var(--color-accent-hover)] disabled:opacity-60"
        >
          {busy ? '…' : 'Auf die Liste'}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 flex h-12 w-full items-center justify-center rounded-2xl text-[15px] font-semibold text-[var(--color-muted)] transition-press active:bg-[var(--color-surface-2)]"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
