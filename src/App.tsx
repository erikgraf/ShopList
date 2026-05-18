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
      <header className="safe-top sticky top-0 z-20 space-y-3 bg-[var(--color-bg)]/95 px-4 pt-3 pb-3 backdrop-blur">
        <div className="flex items-baseline justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Einkaufsliste</h1>
          <span className="text-xs text-[var(--color-muted)]">
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
          <div className="flex items-center justify-between pt-4 pb-1">
            <h2 className="text-xs uppercase tracking-wide text-[var(--color-muted)]">Erledigt</h2>
            <button
              type="button"
              onClick={() => clearChecked()}
              className="text-xs text-[var(--color-muted)] underline-offset-2 active:underline"
            >
              Entfernen
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
    <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center text-sm text-[var(--color-muted)]">
      {filtered ? (
        <>Mit diesen Filtern steht nichts auf der Liste.</>
      ) : (
        <>Tippe oben, um Produkte hinzuzufügen — oder scanne einen Barcode.</>
      )}
    </div>
  );
}
