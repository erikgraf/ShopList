/**
 * OffersToggle — the "Meine %" filter pill in the chip row.
 *
 * Phase 1 was a single on/off boolean. Phase 2 adds the four match tiers
 * (Marken / Produkte / Kategorien / Alle) the user asked for. v0 cycles on
 * tap; a proper bottom-sheet selector is the next refinement.
 *
 * Cycle order matches the user's mental specificity → breadth ordering:
 *   off → Marken → Produkte → Kategorien → Alle → off
 *
 * Active state shows the active tier ("Meine % · Marken") so it's clear what
 * the filter is doing at a glance. `count` is the resulting filtered-list
 * length under the current tier, blank when 0 or off.
 */
import type { OffersTier } from '../facets';

const TIER_LABEL: Record<OffersTier, string> = {
  marken:     'Marken',
  produkte:   'Produkte',
  kategorien: 'Kategorien',
  alle:       'Alle',
};

const CYCLE: (OffersTier | null)[] = [null, 'marken', 'produkte', 'kategorien', 'alle'];

export function OffersToggle({
  tier,
  count,
  onChange,
}: {
  tier: OffersTier | null;
  count: number;
  onChange: (next: OffersTier | null) => void;
}) {
  const active = tier !== null;
  const next = () => {
    const i = CYCLE.indexOf(tier);
    onChange(CYCLE[(i + 1) % CYCLE.length]);
  };
  return (
    <button
      type="button"
      onClick={next}
      aria-pressed={active}
      aria-label={
        active ? `Meine %: ${TIER_LABEL[tier]} (tippen zum Wechseln)` : 'Meine % aktivieren'
      }
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[13.5px] font-semibold transition-press ${
        active ? 'text-white' : 'bg-[var(--color-surface)] text-[var(--color-offer)]'
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
        {active && <span className="ml-1 font-normal opacity-90">· {TIER_LABEL[tier]}</span>}
      </span>
      {active && count > 0 && (
        <span
          className="inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10.5px] font-bold tabular-nums"
          style={{ background: 'rgba(255,255,255,0.28)', color: '#fff' }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
