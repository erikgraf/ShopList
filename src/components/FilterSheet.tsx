import { useEffect } from 'react';
import {
  type FacetCounts,
  type FilterState,
  type Status,
  countFilters,
  emptyFilter,
  toggleInSet,
} from '../facets';
import { CatalogIcon } from '../icons';
import {
  setIconStyle,
  setPreferences,
  useIconStyle,
  usePreferences,
  type IconStyle,
} from '../store';
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
  const iconStyle = useIconStyle();
  const prefs = usePreferences();
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  // Stores are exclusive — picking one replaces any current selection.
  const toggleStore = (s: Store) => {
    const next = new Set<Store>();
    if (!filter.stores.has(s) || filter.stores.size !== 1) next.add(s);
    onChange({ ...filter, stores: next });
  };
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
        className="flex-1 bg-black/30 backdrop-blur-sm"
      />
      <div
        className="safe-bottom max-h-[80vh] overflow-y-auto rounded-t-3xl bg-[var(--color-surface)]"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between bg-[var(--color-surface)] px-5 pt-4 pb-3">
          <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-[var(--color-border-strong)]" />
          <h2 className="pt-2 text-base font-semibold text-[var(--color-text-strong)]">
            Filter{' '}
            {countFilters(filter) > 0 && (
              <span className="font-normal text-[var(--color-muted)]">({countFilters(filter)})</span>
            )}
          </h2>
          <div className="flex gap-4 pt-2 text-sm">
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

        <div className="space-y-6 px-5 pb-6 pt-2">
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

          <Section title="Vorlieben">
            <p className="mb-2 text-xs text-[var(--color-muted)]">
              Steuert Marken-Vorschläge. Wenn du nichts ausgewählt hast, schlagen wir die
              Eigenmarke des aktiven Ladens vor.
            </p>
            <Toggle
              label="Bio bevorzugen"
              hint="Wenn der Laden eine Bio-Linie hat (z. B. dmBio, GUT BIO), wird sie vorgeschlagen."
              active={prefs.preferBio}
              onToggle={() => setPreferences({ preferBio: !prefs.preferBio })}
            />
          </Section>

          <Section title="Symbolstil">
            <div className="grid grid-cols-2 gap-3">
              <StyleTile
                style="line"
                label="Linien"
                active={iconStyle === 'line'}
                onSelect={() => setIconStyle('line')}
              />
              <StyleTile
                style="doodle"
                label="Gezeichnet"
                active={iconStyle === 'doodle'}
                onSelect={() => setIconStyle('doodle')}
              />
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
        {title}
      </h3>
      {children}
    </div>
  );
}

function ChipGroup({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-2">{children}</div>;
}

function Toggle({
  label,
  hint,
  active,
  onToggle,
}: {
  label: string;
  hint?: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left transition-press ${
        active
          ? 'bg-[var(--color-accent-soft)]'
          : 'bg-[var(--color-surface-2)] active:bg-[var(--color-border)]'
      }`}
    >
      <span className="min-w-0 flex-1 pr-3">
        <span className="block text-sm font-medium text-[var(--color-text)]">{label}</span>
        {hint && <span className="block text-xs text-[var(--color-muted)]">{hint}</span>}
      </span>
      <span
        className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${
          active ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            active ? 'left-[1.125rem]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  );
}

function StyleTile({
  style,
  label,
  active,
  onSelect,
}: {
  style: IconStyle;
  label: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex items-center gap-3 rounded-2xl border-2 px-3 py-3 text-left transition-press ${
        active
          ? 'border-[var(--color-accent)] bg-[var(--color-accent-soft)]'
          : 'border-transparent bg-[var(--color-surface-2)] active:bg-[var(--color-border)]'
      }`}
    >
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white"
        style={{ color: 'var(--color-accent)' }}
      >
        <CatalogIcon name="apfel" size={28} style={style} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[var(--color-text)]">{label}</span>
        <span className="block text-xs text-[var(--color-muted)]">
          {style === 'line' ? 'Klare Liniengrafik' : 'Lockerer Stil'}
        </span>
      </span>
    </button>
  );
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
      className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-press ${
        active
          ? 'bg-[var(--color-accent)] text-white'
          : 'bg-[var(--color-surface-2)] text-[var(--color-text)] active:bg-[var(--color-border)]'
      }`}
    >
      <span>{children}</span>
      <span
        className={`min-w-[1.25rem] rounded-full px-1.5 text-center text-[11px] font-semibold tabular-nums ${
          active ? 'bg-white/25 text-white' : 'bg-[var(--color-surface)] text-[var(--color-muted)]'
        }`}
      >
        {count}
      </span>
    </button>
  );
}
