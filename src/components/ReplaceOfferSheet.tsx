/**
 * ReplaceOfferSheet — opened by tapping the offer line (the small % pill) on a
 * matched list item. Shows the offer(s) that match this item and lets the user
 * swap their generic entry for a concrete deal ("Tomaten" → "Cherryrispen-
 * tomaten 200 g · Aldi · €1,29"). The item keeps its place + quantity.
 */
import { useMemo } from 'react';
import type { Item } from '../types';
import {
  type Offer,
  doesOfferMatchHistory,
  categorizeOffer,
  offerKey,
  offerValidityLabel,
} from '../offers';
import { replaceItemWithOffer } from '../store';

const STORE_LABEL: Record<string, string> = {
  aldi: 'Aldi', dm: 'DM', rewe: 'Rewe', edeka: 'Edeka', lidl: 'Lidl',
  netto: 'Netto', kaufland: 'Kaufland', rossmann: 'Rossmann',
};
const STORE_DOT: Record<string, string> = {
  aldi: '#1b4a9c', lidl: '#0a5bb5', rewe: '#cc0a1e', edeka: '#1f72b8',
  dm: '#0a2a6b', rossmann: '#c4022e', netto: '#ffd400', kaufland: '#e10915',
};

export function ReplaceOfferSheet({
  item,
  offers,
  onClose,
}: {
  item: Item;
  offers: Offer[];
  onClose: () => void;
}) {
  const fmt = (n: number) => `€${n.toFixed(2).replace('.', ',')}`;

  // All offers of the same product type as this item (the produkte match),
  // deepest discount first. These are the swap candidates.
  const matches = useMemo(() => {
    return offers
      .filter((o) => doesOfferMatchHistory(o, [item], 'produkte') || doesOfferMatchHistory(o, [item], 'marken'))
      .sort((a, b) => (a.discount_pct ?? 0) - (b.discount_pct ?? 0));
  }, [offers, item]);

  const replace = async (o: Offer) => {
    await replaceItemWithOffer(item.id, { ...o, category: categorizeOffer(o) });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={onClose}>
      <div
        className="rounded-t-3xl bg-[var(--color-surface)] px-4 pb-6 pt-3"
        style={{ boxShadow: 'var(--shadow-lg)', paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 24px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--color-border-strong)]" aria-hidden />

        <p className="px-1 text-[13px] text-[var(--color-muted)]">
          Angebot für <span className="font-semibold text-[var(--color-text)]">{item.name}</span>
        </p>

        <ul className="mt-3 flex max-h-[55vh] flex-col gap-2 overflow-y-auto">
          {matches.map((o, i) => {
            const validity = offerValidityLabel(o);
            return (
              <li key={`${offerKey(o)}-${i}`}>
                <button
                  type="button"
                  onClick={() => replace(o)}
                  className="flex w-full items-stretch gap-3 rounded-2xl bg-[var(--color-surface-2)] p-3 text-left transition-press active:opacity-80"
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[var(--color-surface)]" aria-hidden>
                    {o.image && <img src={o.image} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                    <p className="truncate text-[14.5px] font-semibold leading-tight text-[var(--color-text)]">
                      {o.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-1.5 text-[11.5px] text-[var(--color-muted)]">
                      <span className="inline-flex items-center gap-1">
                        <span className="h-[6px] w-[6px] rounded-full" style={{ background: STORE_DOT[o.store] ?? 'currentColor' }} aria-hidden />
                        {STORE_LABEL[o.store] ?? o.store}
                      </span>
                      {validity && (
                        <>
                          <span className="opacity-50">·</span>
                          <span>{validity}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end justify-center">
                    {o.price !== undefined && (
                      <span className="text-[16px] font-extrabold tabular-nums text-[var(--color-text)]">
                        {fmt(o.price)}
                      </span>
                    )}
                    {o.discount_pct !== undefined && o.discount_pct < 0 && (
                      <span
                        className="rounded-md px-1.5 text-[10.5px] font-bold tabular-nums"
                        style={{ background: 'var(--color-offer-soft)', color: 'var(--color-offer)' }}
                      >
                        {o.discount_pct}%
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}
          {matches.length === 0 && (
            <li className="px-1 py-4 text-center text-sm text-[var(--color-muted)]">
              Kein passendes Angebot mehr verfügbar.
            </li>
          )}
        </ul>

        <button
          type="button"
          onClick={onClose}
          className="mt-3 flex h-12 w-full items-center justify-center rounded-2xl text-[15px] font-semibold text-[var(--color-muted)] transition-press active:bg-[var(--color-surface-2)]"
        >
          Abbrechen
        </button>
      </div>
    </div>
  );
}
