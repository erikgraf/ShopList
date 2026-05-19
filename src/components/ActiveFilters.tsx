import { type FilterState, countFilters, toggleInSet } from '../facets';
import { CATEGORY_LABELS, STORES } from '../types';

interface Props {
  filter: FilterState;
  onChange: (next: FilterState) => void;
  onOpenSheet: () => void;
}

const STATUS_LABEL: Record<string, string> = { open: 'Offen', done: 'Erledigt' };

export function ActiveFilters({ filter, onChange, onOpenSheet }: Props) {
  const total = countFilters(filter);
  const storeLabel = (id: string) => STORES.find((s) => s.id === id)?.label ?? id;

  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenSheet}
          aria-label="Filter öffnen"
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-press ${
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
          <span>Filter</span>
          {total > 0 && (
            <span className="min-w-[1.2rem] rounded-full bg-white/25 px-1.5 text-center text-[11px] font-semibold tabular-nums">
              {total}
            </span>
          )}
        </button>

        {[...filter.statuses].map((s) => (
          <RemovableChip
            key={`status:${s}`}
            label={STATUS_LABEL[s] ?? s}
            onRemove={() => onChange({ ...filter, statuses: toggleInSet(filter.statuses, s) })}
          />
        ))}
        {[...filter.stores].map((s) => (
          <RemovableChip
            key={`store:${s}`}
            label={storeLabel(s)}
            onRemove={() => onChange({ ...filter, stores: toggleInSet(filter.stores, s) })}
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
