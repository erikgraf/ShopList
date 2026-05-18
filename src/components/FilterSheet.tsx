import { useEffect } from 'react';
import {
  type FacetCounts,
  type FilterState,
  type Status,
  countFilters,
  emptyFilter,
  toggleInSet,
} from '../facets';
import { CATEGORY_LABELS, STORES, type Category, type Store } from '../types';

interface Props {
  open: boolean;
  filter: FilterState;
  facets: FacetCounts;
  onChange: (next: FilterState) => void;
  onClose: () => void;
}

const STATUS_LABEL: Record<Status, string> = { open: 'Offen', done: 'Erledigt' };

export function FilterSheet({ open, filter, facets, onChange, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const toggleStore = (s: Store) => onChange({ ...filter, stores: toggleInSet(filter.stores, s) });
  const toggleCategory = (c: Category) =>
    onChange({ ...filter, categories: toggleInSet(filter.categories, c) });
  const toggleBrand = (b: string) => onChange({ ...filter, brands: toggleInSet(filter.brands, b) });
  const toggleStatus = (s: Status) =>
    onChange({ ...filter, statuses: toggleInSet(filter.statuses, s) });

  const brandsSorted = [...facets.brands.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div className="fixed inset-0 z-40 flex flex-col">
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        className="flex-1 bg-black/60 backdrop-blur-sm"
      />
      <div className="safe-bottom max-h-[80vh] overflow-y-auto rounded-t-3xl bg-[var(--color-surface)] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
          <h2 className="text-base font-semibold">
            Filter {countFilters(filter) > 0 && <span className="text-[var(--color-muted)]">({countFilters(filter)})</span>}
          </h2>
          <div className="flex gap-3 text-sm">
            <button
              type="button"
              onClick={() => onChange(emptyFilter())}
              className="text-[var(--color-muted)] active:underline"
            >
              Zurücksetzen
            </button>
            <button
              type="button"
              onClick={onClose}
              className="font-semibold text-[var(--color-accent)] active:underline"
            >
              Fertig
            </button>
          </div>
        </div>

        <div className="space-y-5 p-4">
          <Section title="Status">
            <ChipGroup>
              {(['open', 'done'] as Status[]).map((s) => (
                <Chip
                  key={s}
                  active={filter.statuses.has(s)}
                  count={facets.statuses.get(s) ?? 0}
                  onClick={() => toggleStatus(s)}
                >
                  {STATUS_LABEL[s]}
                </Chip>
              ))}
            </ChipGroup>
          </Section>

          <Section title="Läden">
            <ChipGroup>
              {STORES.map((s) => {
                const c = facets.stores.get(s.id) ?? 0;
                if (c === 0 && !filter.stores.has(s.id)) return null;
                return (
                  <Chip
                    key={s.id}
                    active={filter.stores.has(s.id)}
                    count={c}
                    onClick={() => toggleStore(s.id)}
                  >
                    {s.label}
                  </Chip>
                );
              })}
            </ChipGroup>
          </Section>

          <Section title="Kategorien">
            <ChipGroup>
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => {
                const cnt = facets.categories.get(c) ?? 0;
                if (cnt === 0 && !filter.categories.has(c)) return null;
                return (
                  <Chip
                    key={c}
                    active={filter.categories.has(c)}
                    count={cnt}
                    onClick={() => toggleCategory(c)}
                  >
                    {CATEGORY_LABELS[c]}
                  </Chip>
                );
              })}
            </ChipGroup>
          </Section>

          {brandsSorted.length > 0 && (
            <Section title="Marken">
              <ChipGroup>
                {brandsSorted.map(([b, c]) => (
                  <Chip
                    key={b}
                    active={filter.brands.has(b)}
                    count={c}
                    onClick={() => toggleBrand(b)}
                  >
                    {b}
                  </Chip>
                ))}
              </ChipGroup>
            </Section>
          )}

        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs uppercase tracking-wide text-[var(--color-muted)]">{title}</h3>
      {children}
    </div>
  );
}

function ChipGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Chip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
        active
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-bg)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)]'
      }`}
    >
      <span>{children}</span>
      <span
        className={`min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[11px] tabular-nums ${
          active ? 'bg-black/20' : 'bg-[var(--color-bg)] text-[var(--color-muted)]'
        }`}
      >
        {count}
      </span>
    </button>
  );
}
