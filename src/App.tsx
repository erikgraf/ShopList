import { lazy, Suspense, useMemo, useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { ItemRow } from './components/ItemRow';
import { ActiveFilters } from './components/ActiveFilters';
import { FilterSheet } from './components/FilterSheet';
import { applyFilter, computeFacets, emptyFilter } from './facets';
import { clearChecked, useItems } from './store';

const Scanner = lazy(() => import('./components/Scanner').then((m) => ({ default: m.Scanner })));

export default function App() {
  const items = useItems();
  const [filter, setFilter] = useState(emptyFilter);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  const facets = useMemo(() => computeFacets(items, filter), [items, filter]);
  const filtered = useMemo(() => applyFilter(items, filter), [items, filter]);

  const open = filtered.filter((it) => !it.checked);
  const done = filtered.filter((it) => it.checked);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <header className="safe-top sticky top-0 z-20 space-y-3 bg-[var(--color-bg)]/90 px-4 pt-4 pb-3 backdrop-blur-md">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text-strong)]">
            Einkaufsliste
          </h1>
          <span className="text-xs font-medium text-[var(--color-muted)]">
            {open.length} offen{done.length > 0 ? ` · ${done.length} erledigt` : ''}
          </span>
        </div>
        <SearchBar onScanClick={() => setScanOpen(true)} />
        <ActiveFilters filter={filter} onChange={setFilter} onOpenSheet={() => setSheetOpen(true)} />
      </header>

      <main className="flex-1 space-y-2 px-4 pt-2 pb-32">
        {open.length === 0 && done.length === 0 && (
          <EmptyState filtered={items.length > 0} />
        )}
        {open.map((it) => (
          <ItemRow key={it.id} item={it} />
        ))}
        {done.length > 0 && (
          <div className="flex items-center justify-between pt-6 pb-1.5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
              Erledigt
            </h2>
            <button
              type="button"
              onClick={() => clearChecked()}
              className="rounded-full px-2 py-1 text-xs font-medium text-[var(--color-muted)] active:bg-[var(--color-surface-2)] active:text-[var(--color-text)]"
            >
              Alle entfernen
            </button>
          </div>
        )}
        {done.map((it) => (
          <ItemRow key={it.id} item={it} />
        ))}
      </main>

      <FilterSheet
        open={sheetOpen}
        filter={filter}
        facets={facets}
        onChange={setFilter}
        onClose={() => setSheetOpen(false)}
      />

      {scanOpen && (
        <Suspense fallback={null}>
          <Scanner onClose={() => setScanOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="mt-12 rounded-3xl bg-[var(--color-surface)] p-8 text-center" style={{ boxShadow: 'var(--shadow-sm)' }}>
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)]">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-accent)]">
          <path d="M3 4h2l2.5 12h11l2-9H7" />
          <circle cx="9" cy="20" r="1.5" fill="currentColor" />
          <circle cx="17" cy="20" r="1.5" fill="currentColor" />
        </svg>
      </div>
      <p className="text-base font-medium text-[var(--color-text)]">
        {filtered ? 'Mit diesen Filtern steht nichts auf der Liste.' : 'Deine Liste ist noch leer.'}
      </p>
      {!filtered && (
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Tippe oben, um Produkte hinzuzufügen — oder scanne einen Barcode.
        </p>
      )}
    </div>
  );
}
