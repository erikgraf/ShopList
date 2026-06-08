import type { FacetCounts, FilterState } from '../facets';
import { STORES, type Store } from '../types';

interface Props {
  filter: FilterState;
  facets: FacetCounts;
  onChange: (next: FilterState) => void;
}

// Brand cue per store — recognise a shop by colour before reading its label.
// Mirror these into the @theme block as --store-* if you prefer tokens.
const STORE_COLOR: Record<Store, string> = {
  aldi: '#1b4a9c',
  lidl: '#0a5bb5',
  rewe: '#cc0a1e',
  edeka: '#1f72b8',
  dm: '#0a2a6b',
  rossmann: '#c4022e',
};

export function StoreChips({ filter, facets, onChange }: Props) {
  // Store filter is exclusive: only one store can be active at a time. Tapping
  // the active one again clears the filter (show all stores).
  const select = (s: Store) => {
    const next = new Set<Store>();
    if (!filter.stores.has(s) || filter.stores.size !== 1) next.add(s);
    onChange({ ...filter, stores: next });
  };

  return (
    // mask-image fades the right edge so it's obvious the row scrolls to more
    // stores (Edeka / DM / Rossmann) when they overflow.
    <div
      className="-mx-4 overflow-x-auto px-4"
      style={{
        maskImage: 'linear-gradient(to right, #000 calc(100% - 24px), transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, #000 calc(100% - 24px), transparent 100%)',
      }}
    >
      <div className="flex gap-2">
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
  );
}
