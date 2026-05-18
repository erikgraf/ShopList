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
          className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm ${
            total > 0
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-bg)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18" />
            <path d="M7 12h10" />
            <path d="M10 18h4" />
          </svg>
          <span>Filter</span>
          {total > 0 && (
            <span className="min-w-[1.25rem] rounded-full bg-black/20 px-1.5 text-center text-[11px] tabular-nums">
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
      className="flex shrink-0 items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)] py-1.5 pr-2 pl-3 text-sm"
    >
      <span>{label}</span>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M6 6l12 12" />
        <path d="M18 6L6 18" />
      </svg>
    </button>
  );
}
