/**
 * OffersToggle — the entry pill to the Angebote view.
 *
 * Single tap opens the fullscreen OffersView. Shows the total weekly offers
 * count as a badge so the pill carries some information even when the view
 * is closed (0 hides the badge — same convention as the chip-row store
 * counters).
 */
export function OffersToggle({ count, onOpen }: { count: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Angebote öffnen"
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--color-surface)] px-2.5 py-1.5 text-[13.5px] font-semibold text-[var(--color-offer)] transition-press"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <span>
        Meine <b className="font-extrabold">%</b>
      </span>
      {count > 0 && (
        <span
          className="inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold tabular-nums"
          style={{ background: 'var(--color-offer-soft)', color: 'var(--color-offer)' }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
