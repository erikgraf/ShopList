/**
 * OffersToggle — the entry pill to the Angebote view.
 *
 * Header redesign "Option A+": compact `% N` pill that lives at the end of
 * the progress row (it's navigation, not a filter — so it sits with status,
 * not in the filter row). Single tap opens the fullscreen OffersView. The
 * badge carries the total weekly offers count; 0 hides it, same convention
 * as the chip-row counters.
 */
export function OffersToggle({ count, onOpen }: { count: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Angebote öffnen"
      className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-surface)] px-2 py-1 text-[12.5px] font-semibold text-[var(--color-offer)] transition-press"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <span className="font-extrabold">%</span>
      {count > 0 && (
        <span
          className="inline-flex min-w-[18px] items-center justify-center rounded-full px-1 text-[10.5px] font-bold tabular-nums"
          style={{ background: 'var(--color-offer-soft)', color: 'var(--color-offer)' }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
