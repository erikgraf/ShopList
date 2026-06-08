/**
 * OfferCard — one row in the Angebote view.
 *
 * Layout: thumbnail (optional, from offer.image) · name + brand · store chip ·
 * price block (sale + strikethrough + −N % bubble) · "Hinzufügen" CTA on the
 * right. Tapping anywhere on the card invokes onAdd — the tap target is the
 * full card; the button is a visual affordance only (matches how the rest of
 * the app handles row clicks).
 */
import type { Offer } from '../offers';

/** Store color cues, mirrored from .gitignored StoreChips brand-dot map.
 *  Kept literal here so the card has a visible "Aldi" / "DM" / … chip even
 *  when the offer's store isn't one of the curated 6. */
const STORE_LABEL: Record<string, string> = {
  aldi: 'Aldi', dm: 'DM', rewe: 'Rewe', edeka: 'Edeka', lidl: 'Lidl',
  netto: 'Netto', kaufland: 'Kaufland', rossmann: 'Rossmann',
};
const STORE_COLOR: Record<string, string> = {
  aldi:    'var(--store-aldi, #1b4a9c)',
  dm:      'var(--store-dm, #0a2a6b)',
  rewe:    'var(--store-rewe, #cc0a1e)',
  edeka:   'var(--store-edeka, #1f72b8)',
  lidl:    'var(--store-lidl, #0a5bb5)',
  netto:   '#ffd400',                          // Netto yellow — no curated var
  kaufland:'#e10915',
  rossmann:'var(--store-rossmann, #c4022e)',
};

export function OfferCard({
  offer,
  onLists,
  onAdd,
}: {
  offer: Offer;
  /** Names of any lists that already contain a matching item — surfaced
   *  as small "Auf Liste …" chips so the user knows the deal hits
   *  something they've already planned for. Empty when no match. */
  onLists?: string[];
  onAdd: () => void;
}) {
  const fmt = (n: number) => n.toFixed(2).replace('.', ',');
  return (
    <button
      type="button"
      onClick={onAdd}
      className="flex w-full items-stretch gap-3 rounded-2xl bg-[var(--color-surface)] p-3 text-left transition-press active:bg-[var(--color-surface-hover)]"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      {/* Thumbnail (placeholder block if no image) */}
      <div
        className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[var(--color-surface-2)]"
        aria-hidden
      >
        {offer.image ? (
          <img
            src={offer.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(e) => (e.currentTarget.style.visibility = 'hidden')}
          />
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-[var(--color-muted)]">
            <path d="M3 4h2l2.5 12h11l2-9H7" />
            <circle cx="9" cy="20" r="1.5" fill="currentColor" />
            <circle cx="17" cy="20" r="1.5" fill="currentColor" />
          </svg>
        )}
      </div>

      {/* Name + meta */}
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold leading-tight text-[var(--color-text)]">
            {offer.name}
          </p>
          {offer.brand && (
            <p className="truncate text-[12.5px] text-[var(--color-muted)]">{offer.brand}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Store chip */}
          <span
            className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-2)] py-0.5 pl-1.5 pr-2 text-[11px] font-semibold uppercase tracking-wide"
          >
            <span
              className="h-[6px] w-[6px] rounded-full"
              style={{ background: STORE_COLOR[offer.store] ?? 'var(--color-muted)' }}
              aria-hidden
            />
            <span className="text-[var(--color-text)]">
              {STORE_LABEL[offer.store] ?? offer.store}
            </span>
          </span>
          {offer.discount_pct !== undefined && offer.discount_pct < 0 && (
            <span
              className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10.5px] font-bold tabular-nums"
              style={{
                background: 'var(--color-offer-soft)',
                color: 'var(--color-offer)',
              }}
            >
              {offer.discount_pct}%
            </span>
          )}
        </div>

        {/* List-match indicator(s). Shown only when this offer hits an item
            already on one of the user's lists — strong signal that the deal
            is worth acting on today, not just "vielleicht mal". */}
        {onLists && onLists.length > 0 && (
          <div className="-mt-0.5 flex flex-wrap items-center gap-1">
            {onLists.map((listName) => (
              <span
                key={listName}
                className="inline-flex items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[10.5px] font-semibold text-[var(--color-accent)]"
              >
                {/* checkmark glyph — already-on-list cue */}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M4 12.5l5 5L20 6" />
                </svg>
                Auf <span className="font-bold">{listName}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Price + Hinzufügen */}
      <div className="flex shrink-0 flex-col items-end justify-between gap-1">
        <div className="flex flex-col items-end leading-tight">
          {offer.price !== undefined && (
            <span className="text-[16px] font-extrabold tabular-nums text-[var(--color-text)]">
              €{fmt(offer.price)}
            </span>
          )}
          {offer.was_price !== undefined && offer.was_price > (offer.price ?? 0) && (
            <span className="text-[11.5px] text-[var(--color-muted)] tabular-nums line-through">
              €{fmt(offer.was_price)}
            </span>
          )}
        </div>
        <span
          className="inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-bold text-white"
          style={{
            background: 'var(--color-accent)',
            boxShadow: '0 1px 2px rgba(45,106,79,0.25)',
          }}
        >
          + Hinzufügen
        </span>
      </div>
    </button>
  );
}
