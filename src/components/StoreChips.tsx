import type { FacetCounts, FilterState } from '../facets';
import { toggleInSet } from '../facets';
import { STORES, type Store } from '../types';

interface Props {
  filter: FilterState;
  facets: FacetCounts;
  onChange: (next: FilterState) => void;
}

export function StoreChips({ filter, facets, onChange }: Props) {
  const toggle = (s: Store) => onChange({ ...filter, stores: toggleInSet(filter.stores, s) });

  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex gap-2">
        {STORES.map((s) => {
          const active = filter.stores.has(s.id);
          const count = facets.stores.get(s.id) ?? 0;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggle(s.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-press ${
                active
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'bg-[var(--color-surface)] text-[var(--color-text)]'
              }`}
              style={{
                boxShadow: active ? '0 1px 2px rgba(45,106,79,0.25)' : 'var(--shadow-sm)',
              }}
            >
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
