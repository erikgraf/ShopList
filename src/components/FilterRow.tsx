import { type FilterState, type FacetCounts, countFilters, toggleInSet } from '../facets';
import { CATEGORY_LABELS, STORES, type Store } from '../types';

interface Props {
  filter: FilterState;
  facets: FacetCounts;
  onChange: (next: FilterState) => void;
  onOpenSheet: () => void;
}

const STATUS_LABEL: Record<string, string> = { open: 'Offen', done: 'Erledigt' };

// Brand cue per store — recognise a shop by colour before reading its label.
const STORE_COLOR: Record<Store, string> = {
  aldi: '#1b4a9c',
  lidl: '#0a5bb5',
  rewe: '#cc0a1e',
  edeka: '#1f72b8',
  dm: '#0a2a6b',
  rossmann: '#c4022e',
};

/**
 * FilterRow — the single control row under the search bar (header redesign
 * "Option A+"). Replaces the old two-row split of StoreChips + ActiveFilters:
 *
 *   [⏶]  [●Aldi 3] [●Lidl 1] [●Rewe 5] [●Edeka] … [Offen ×] [Bier ×] →
 *
 * - The funnel chip is PINNED (doesn't scroll) so the FilterSheet entry is
 *   always in the same place; its badge counts every active facet.
 * - Store chips scroll in the remaining width — they get ~110 px more room
 *   than before because "Meine %" moved up to the progress row.
 * - Active non-store filters (status / category / brand) append as removable
 *   chips after the stores, in the same scroll plane. No store chips here:
 *   an active store already shows as its chip turning green.
 */
export function FilterRow({ filter, facets, onChange, onOpenSheet }: Props) {
  const total = countFilters(filter);

  // Store filter is exclusive: only one store can be active at a time. Tapping
  // the active one again clears the filter (show all stores).
  const select = (s: Store) => {
    const next = new Set<Store>();
    if (!filter.stores.has(s) || filter.stores.size !== 1) next.add(s);
    onChange({ ...filter, stores: next });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onOpenSheet}
        aria-label={total > 0 ? `Filter öffnen (${total} aktiv)` : 'Filter öffnen'}
        className={`relative flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full transition-press ${
          total > 0
            ? 'bg-[var(--color-accent)] text-white'
            : 'bg-[var(--color-surface)] text-[var(--color-text)]'
        }`}
        style={{
          boxShadow: total > 0 ? '0 1px 2px rgba(45,106,79,0.25)' : 'var(--shadow-sm)',
        }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18" />
          <path d="M7 12h10" />
          <path d="M10 18h4" />
        </svg>
        {total > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-[var(--color-accent-strong)] px-1 text-[10.5px] font-bold tabular-nums text-white">
            {total}
          </span>
        )}
      </button>

      {/* mask-image fades the right edge so it's obvious the row scrolls to
          more stores (DM / Rossmann) and any removable filter chips. Bleeds
          only to the RIGHT screen edge; the left stays flush with the pinned
          funnel chip. */}
      <div
        className="-mr-4 min-w-0 flex-1 overflow-x-auto pr-4"
        style={{
          maskImage: 'linear-gradient(to right, #000 calc(100% - 24px), transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, #000 calc(100% - 24px), transparent 100%)',
        }}
      >
        <div className="flex items-center gap-2">
          {/* Active non-store filters FIRST — right next to the funnel — so
              what's filtering the list is visible without scrolling. The
              stores follow; an active store shows on its own chip anyway. */}
          {[...filter.statuses].map((s) => (
            <RemovableChip
              key={`status:${s}`}
              label={STATUS_LABEL[s] ?? s}
              onRemove={() => onChange({ ...filter, statuses: toggleInSet(filter.statuses, s) })}
            />
          ))}
          {[...filter.categories].map((c) => (
            <RemovableChip
              key={`cat:${c}`}
              label={CATEGORY_LABELS[c]}
              onRemove={() => onChange({ ...filter, categories: toggleInSet(filter.categories, c) })}
            />
          ))}
          {[...filter.brands].map((b) => (
            <RemovableChip
              key={`brand:${b}`}
              label={b}
              onRemove={() => onChange({ ...filter, brands: toggleInSet(filter.brands, b) })}
            />
          ))}

          {STORES.map((s) => {
            const active = filter.stores.has(s.id);
            const count = facets.stores.get(s.id) ?? 0;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => select(s.id)}
                className={`flex shrink-0 items-center gap-1.5 rounded-full py-1.5 pl-3 pr-2.5 text-sm font-medium transition-press ${
                  active
                    ? 'bg-[var(--color-accent)] text-white'
                    : 'bg-[var(--color-surface)] text-[var(--color-text)]'
                }`}
                style={{
                  boxShadow: active ? '0 1px 2px rgba(45,106,79,0.25)' : 'var(--shadow-sm)',
                }}
              >
                {/* brand dot — turns white when the chip is active */}
                <span
                  className="h-[7px] w-[7px] shrink-0 rounded-full"
                  style={{ background: active ? '#fff' : STORE_COLOR[s.id] }}
                  aria-hidden
                />
                <span>{s.label}</span>
                <span
                  className={`min-w-[1.1rem] rounded-full px-1.5 text-center text-[10px] font-semibold tabular-nums ${
                    active ? 'bg-white/25 text-white' : 'bg-[var(--color-surface-2)] text-[var(--color-muted)]'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RemovableChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-accent-soft)] py-1.5 pl-3 pr-2 text-sm font-medium text-[var(--color-accent-strong)] transition-press active:bg-[var(--color-accent-soft-hover)]"
    >
      <span>{label}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <path d="M6 6l12 12" />
        <path d="M18 6L6 18" />
      </svg>
    </button>
  );
}
