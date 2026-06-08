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
import { type Offer, stripDiacritics, doesOfferMatchHistory, categorizeOffer } from '../offers';
import { useAllItems, useLists, useRecent } from '../store';
import type { Category } from '../types';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../types';
import { COLORS, GLYPH } from '../icons';
import { OfferCard } from './OfferCard';
import { AddOfferSheet } from './AddOfferSheet';

const TIER_LABEL: Record<OffersTier, string> = {
  marken:     'Marken',
  produkte:   'Produkte',
  kategorien: 'Kategorien',
  alle:       'Alle',
};

const TIERS: OffersTier[] = ['marken', 'produkte', 'kategorien', 'alle'];

/** Monday-of-the-week → Saturday window for the given timestamp. German
 *  chains rotate Mo–Sa, so this is the right shape for the "Gültig" stamp.
 *  Sundays (rare for the cron) round forward to the next Monday. */
function weeklyOfferRange(generatedAt: string | null): { from: Date; to: Date } | null {
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
  return { from, to };
}

/** "09. – 14. Jun" when from + to share a month, else "29. Mai – 03. Jun". */
function formatRange(from: Date, to: Date): string {
  const dayMonth = (d: Date) =>
    d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  const sameMonthSameYear =
    from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  if (sameMonthSameYear) {
    return `${String(from.getDate()).padStart(2, '0')}. – ${dayMonth(to)}`;
  }
  return `${dayMonth(from)} – ${dayMonth(to)}`;
}

export function OffersView({
  offers,
  generatedAt,
  onClose,
}: {
  offers: Offer[];
  generatedAt: string | null;
  onClose: () => void;
}) {
  // Matching set: union of *past purchases* (everything ever added; long-term
  // taste) AND *items currently on any list* (regardless of which list is
  // active right now). The latter is what lets us surface "this offer fits
  // something on your Wocheneinkauf list" — see listsByOffer below.
  const recent = useRecent();
  const allItems = useAllItems();
  const lists = useLists();
  const history = useMemo(() => [...recent, ...allItems], [recent, allItems]);

  const [tier, setTier] = useState<OffersTier>('alle');
  const [pickup, setPickup] = useState<Offer | null>(null);

  const counts = useMemo(() => {
    return TIERS.reduce<Record<OffersTier, number>>(
      (acc, t) => {
        acc[t] = offers.filter((o) => doesOfferMatchHistory(o, history, t)).length;
        return acc;
      },
      { marken: 0, produkte: 0, kategorien: 0, alle: 0 },
    );
  }, [offers, history]);

  const filtered = useMemo(() => {
    if (tier === 'alle') return offers;
    return offers.filter((o) => doesOfferMatchHistory(o, history, tier));
  }, [offers, history, tier]);

  // Per-offer indicator: which (if any) of the user's lists currently
  // contain a marken-tier match (exact EAN or brand+name overlap) for this
  // offer? The OfferCard renders one chip per list — so users see at a
  // glance "this deal hits something on Einkauf · Wocheneinkauf".
  const listsByOffer = useMemo(() => {
    if (allItems.length === 0 || lists.length === 0) return new Map<string, string[]>();
    const listNameById = new Map(lists.map((l) => [l.id, l.name]));
    const out = new Map<string, string[]>();
    for (const o of filtered) {
      const key = `${o.store}|${o.source_url}`;
      const hits = new Set<string>();
      for (const it of allItems) {
        if (doesOfferMatchHistory(o, [it], 'marken')) {
          const name = listNameById.get(it.listId);
          if (name) hits.add(name);
        }
      }
      if (hits.size) out.set(key, [...hits]);
    }
    return out;
  }, [filtered, allItems, lists]);

  // Group filtered offers by ShopList Category — same walk-through-the-store
  // order the main list uses (Obst & Gemüse → Brot → Milch → … → Sonstiges).
  // Within each band, deepest discount first then name. Drops empty bands so
  // the view doesn't render hollow headers.
  const grouped = useMemo(() => {
    const byCat = new Map<Category, Offer[]>();
    for (const o of filtered) {
      const cat = categorizeOffer(o);
      const bucket = byCat.get(cat);
      if (bucket) bucket.push(o);
      else byCat.set(cat, [o]);
    }
    for (const [, list] of byCat) {
      list.sort((a, b) => {
        const da = a.discount_pct ?? 0;
        const db = b.discount_pct ?? 0;
        if (da !== db) return da - db;
        return stripDiacritics(a.name).localeCompare(stripDiacritics(b.name));
      });
    }
    return CATEGORY_ORDER.flatMap<{ cat: Category; offers: Offer[] }>((c) =>
      byCat.has(c) ? [{ cat: c, offers: byCat.get(c)! }] : [],
    );
  }, [filtered]);

  // German chains rotate weekly offers Mon–Sat. Derive the validity window
  // from `generated_at` (when the cron last ran): find the Monday of that
  // week, Saturday = Monday + 5 days. ALDI Süd's listing page itself doesn't
  // surface explicit `priceValidUntil`; if we ever extract it per-product
  // (the /produkt/ JSON-LD doesn't carry it today either) this fallback
  // gives way to the real value.
  const validRange = useMemo(() => weeklyOfferRange(generatedAt), [generatedAt]);
  const validLabel = validRange ? formatRange(validRange.from, validRange.to) : null;

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
          {validLabel && (
            <span className="ml-auto whitespace-nowrap text-[12px] font-medium text-[var(--color-muted)]">
              Gültig {validLabel}
            </span>
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

      {/* Offers list — grouped by ShopList category, same walk-the-store
          order as the main list. Each category gets an aisle band with
          icon + label + count, mirroring ShelfGroup. */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {grouped.length === 0 ? (
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
                : 'Versuche "Alle" — oder kaufe erstmal Produkte ein, dann lernt die Liste deine Marken.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 pb-12">
            {grouped.map(({ cat, offers: bandOffers }) => {
              const [fg, bg] = COLORS[cat];
              return (
                <section
                  key={cat}
                  className="overflow-hidden rounded-2xl bg-[var(--color-surface)]"
                  style={{ boxShadow: 'var(--shadow-sm)' }}
                >
                  {/* aisle band — louder than ShelfGroup's main-list version
                      because in the Angebote view it doubles as navigation,
                      not just decoration. Bigger icon chip, larger label,
                      taller padding so each band reads as its own shelf. */}
                  <header
                    className="flex items-center gap-3 px-4 py-3.5"
                    style={{ background: bg, color: fg }}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-[18px] leading-none"
                      style={{ background: 'rgba(255,255,255,0.55)' }}
                      aria-hidden
                    >
                      {GLYPH[cat]}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[15.5px] font-extrabold tracking-[-0.01em]">
                      {CATEGORY_LABELS[cat]}
                    </span>
                    <span
                      className="inline-flex h-6 min-w-[24px] items-center justify-center rounded-full px-2 text-[12px] font-bold tabular-nums"
                      style={{ background: 'rgba(255,255,255,0.65)', color: fg }}
                    >
                      {bandOffers.length}
                    </span>
                  </header>
                  <ul className="flex flex-col gap-2 p-2">
                    {bandOffers.map((o, i) => {
                      const key = `${o.store}|${o.source_url}`;
                      return (
                        <li key={`${key}-${i}`}>
                          <OfferCard
                            offer={o}
                            onLists={listsByOffer.get(key) ?? []}
                            onAdd={() => setPickup(o)}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {pickup && <AddOfferSheet offer={pickup} onClose={() => setPickup(null)} />}
    </div>
  );
}
