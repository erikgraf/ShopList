/**
 * OffersView — the dedicated Angebote browse screen reached by tapping the
 * "Meine %" pill in the chip row.
 *
 * Header: a back button, an "Angebote" title with the week badge, and a 4-way
 * tier selector (Marken / Produkte / Kategorien / Alle) that filters which
 * offers are visible based on the user's current list:
 *
 *   - Marken     — only offers that exactly match an item the user has
 *                  (EAN === barcode, or brand+name overlap)
 *   - Produkte   — offers whose Stage-2 L3 id matches any item.taxonomyL3
 *                  (e.g. all "Pils" offers when the user has a Pils-tagged item)
 *   - Kategorien — offers at the Stage-2 L2 umbrella (e.g. all "Bier" offers
 *                  when the user has anything bier-flavored)
 *   - Alle       — every offer in this week's feed (default; pure browsing)
 *
 * Each row is an OfferCard with name, brand, store badge, price + was/discount,
 * and a Hinzufügen button that opens AddOfferSheet for explicit confirmation
 * of the quantity + add to the active list.
 */
import { useMemo, useState } from 'react';
import type { OffersTier } from '../facets';
import { type Offer, stripDiacritics, doesOfferMatchItems } from '../offers';
import { useItems } from '../store';
import { OfferCard } from './OfferCard';
import { AddOfferSheet } from './AddOfferSheet';

const TIER_LABEL: Record<OffersTier, string> = {
  marken:     'Marken',
  produkte:   'Produkte',
  kategorien: 'Kategorien',
  alle:       'Alle',
};

const TIERS: OffersTier[] = ['marken', 'produkte', 'kategorien', 'alle'];

export function OffersView({
  offers,
  generatedAt,
  onClose,
}: {
  offers: Offer[];
  generatedAt: string | null;
  onClose: () => void;
}) {
  const items = useItems();
  const [tier, setTier] = useState<OffersTier>('alle');
  const [pickup, setPickup] = useState<Offer | null>(null);

  // Filter the feed by tier — Alle is the default, the other three require
  // an item-match. Counts pre-computed per tier so we can show them in chips.
  const counts = useMemo(() => {
    return TIERS.reduce<Record<OffersTier, number>>(
      (acc, t) => {
        acc[t] = offers.filter((o) => doesOfferMatchItems(o, items, t)).length;
        return acc;
      },
      { marken: 0, produkte: 0, kategorien: 0, alle: 0 },
    );
  }, [offers, items]);

  const filtered = useMemo(() => {
    if (tier === 'alle') return offers;
    return offers.filter((o) => doesOfferMatchItems(o, items, tier));
  }, [offers, items, tier]);

  // Cosmetic sort: deepest discount first, then everything else by name.
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const da = a.discount_pct ?? 0;
        const db = b.discount_pct ?? 0;
        if (da !== db) return da - db; // more-negative first
        return stripDiacritics(a.name).localeCompare(stripDiacritics(b.name));
      }),
    [filtered],
  );

  const weekLabel = generatedAt
    ? new Date(generatedAt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
    : null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[var(--color-bg)]">
      {/* Header */}
      <header
        className="flex items-center gap-2 border-b border-[var(--color-border)] px-3 py-3"
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-press active:bg-[var(--color-surface-2)]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex min-w-0 flex-1 items-baseline gap-2">
          <h1 className="truncate text-[20px] font-extrabold text-[var(--color-text)]">Angebote</h1>
          <span className="text-sm text-[var(--color-muted)]">{offers.length}</span>
          {weekLabel && (
            <span className="ml-auto text-[12px] text-[var(--color-muted)]">Stand {weekLabel}</span>
          )}
        </div>
      </header>

      {/* Tier selector */}
      <div className="overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2">
        <div className="flex min-w-min gap-2">
          {TIERS.map((t) => {
            const active = t === tier;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                aria-pressed={active}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13.5px] font-semibold transition-press ${
                  active ? 'text-white' : 'bg-[var(--color-surface)] text-[var(--color-text)]'
                }`}
                style={{
                  background: active ? 'var(--color-offer)' : undefined,
                  boxShadow: active
                    ? '0 1px 2px color-mix(in oklab, var(--color-offer), transparent 62%)'
                    : 'var(--shadow-sm)',
                }}
              >
                <span>{TIER_LABEL[t]}</span>
                <span
                  className="inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold tabular-nums"
                  style={
                    active
                      ? { background: 'rgba(255,255,255,0.28)', color: '#fff' }
                      : { background: 'var(--color-surface-2)', color: 'var(--color-muted)' }
                  }
                >
                  {counts[t]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Offers list */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {sorted.length === 0 ? (
          <div
            className="mt-6 rounded-3xl bg-[var(--color-surface)] p-8 text-center"
            style={{ boxShadow: 'var(--shadow-sm)' }}
          >
            <p className="text-base font-medium text-[var(--color-text)]">
              Keine Angebote in dieser Kategorie.
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">
              {tier === 'alle'
                ? 'Der Worker hat noch keine Daten gespeichert. Lauf `node scripts/run-offers.ts --write`.'
                : 'Versuche "Alle" — oder lege erst ein paar Produkte auf deine Liste.'}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2 pb-12">
            {sorted.map((o, i) => (
              <li key={`${o.store}-${o.source_url}-${i}`}>
                <OfferCard offer={o} onAdd={() => setPickup(o)} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {pickup && <AddOfferSheet offer={pickup} onClose={() => setPickup(null)} />}
    </div>
  );
}
