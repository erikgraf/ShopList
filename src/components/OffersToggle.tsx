/**
 * OffersToggle — the "Meine %" filter pill that replaced the old "Filter"
 * entry point in the chip row. Single tap filters the list to items currently
 * on offer; tap again to clear.
 *
 * `count` is the number of open items on offer (0 hides the count badge).
 * `active` / `onToggle` are controlled by the parent so the filter state lives
 * alongside the existing FilterState in App.
 */
export function OffersToggle({
  active,
  count,
  onToggle,
}: {
  active: boolean;
  count: number;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13.5px] font-semibold transition-press ${
        active
          ? 'text-white'
          : 'bg-[var(--color-surface)] text-[var(--color-offer)]'
      }`}
      style={{
        background: active ? 'var(--color-offer)' : undefined,
        boxShadow: active
          ? '0 1px 2px color-mix(in oklab, var(--color-offer), transparent 62%)'
          : 'var(--shadow-sm)',
      }}
    >
      <span>
        Meine <b className="font-extrabold">%</b>
      </span>
      {count > 0 && (
        <span
          className="inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold tabular-nums"
          style={
            active
              ? { background: 'rgba(255,255,255,0.28)', color: '#fff' }
              : { background: 'var(--color-offer-soft)', color: 'var(--color-offer)' }
          }
        >
          {count}
        </span>
      )}
    </button>
  );
}
