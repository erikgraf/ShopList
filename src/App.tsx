import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { ItemRow } from './components/ItemRow';
import { ActiveFilters } from './components/ActiveFilters';
import { FilterSheet } from './components/FilterSheet';
import { StoreChips } from './components/StoreChips';
import { ListSwitcher } from './components/ListSwitcher';
import { applyFilter, computeFacets, emptyFilter } from './facets';
import {
  clearChecked,
  ensureDefaultList,
  setActiveListId,
  useActiveListId,
  useItems,
  useLists,
} from './store';
import { CATEGORY_LABELS, CATEGORY_ORDER, type Category, type Item } from './types';

const NewListSheet = lazy(() =>
  import('./components/NewListSheet').then((m) => ({ default: m.NewListSheet })),
);

const Scanner = lazy(() => import('./components/Scanner').then((m) => ({ default: m.Scanner })));

const ShopMode = lazy(() =>
  import('./components/ShopMode').then((m) => ({ default: m.ShopMode })),
);

export default function App() {
  const items = useItems();
  const lists = useLists();
  const activeListId = useActiveListId();
  const [filter, setFilter] = useState(emptyFilter);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [newListOpen, setNewListOpen] = useState(false);

  useEffect(() => {
    void ensureDefaultList();
  }, []);

  const facets = useMemo(() => computeFacets(items, filter), [items, filter]);
  const filtered = useMemo(() => applyFilter(items, filter), [items, filter]);
  // The single active store, if any — drives per-store brand pinning when
  // adding items, and per-store brand display in rows.
  const activeStore = filter.stores.size === 1 ? [...filter.stores][0] : undefined;

  const open = filtered.filter((it) => !it.checked);
  const done = filtered.filter((it) => it.checked);

  const grouped = useMemo(() => groupByCategory(open), [open]);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <header className="safe-top sticky top-0 z-20 space-y-3 bg-[var(--color-bg)]/90 px-4 pt-4 pb-3 backdrop-blur-md">
        <ListSwitcher
          lists={lists}
          activeListId={activeListId}
          onSwitch={setActiveListId}
          onCreateNew={() => setNewListOpen(true)}
        />
        <div className="text-center text-xs font-medium text-[var(--color-muted)]">
          {open.length} offen{done.length > 0 ? ` · ${done.length} erledigt` : ''}
        </div>
        <SearchBar
          onScanClick={() => setScanOpen(true)}
          onShopModeClick={() => setShopOpen(true)}
          pinToStore={activeStore}
        />
        <StoreChips filter={filter} facets={facets} onChange={setFilter} />
        <ActiveFilters filter={filter} onChange={setFilter} onOpenSheet={() => setSheetOpen(true)} />
      </header>

      <main className="flex-1 px-4 pt-2 pb-32">
        {open.length === 0 && done.length === 0 && <EmptyState filtered={items.length > 0} />}

        {grouped.map(([category, rows], i) => (
          <section key={category} className={i === 0 ? '' : 'mt-5'}>
            <CategoryHeader category={category} count={rows.length} />
            <div className="space-y-2">
              {rows.map((it) => (
                <ItemRow key={it.id} item={it} activeStores={[...filter.stores]} />
              ))}
            </div>
          </section>
        ))}

        {done.length > 0 && (
          <section className={grouped.length > 0 ? 'mt-7' : ''}>
            <div className="mb-2 flex items-center justify-between px-1">
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
            <div className="space-y-2">
              {done.map((it) => (
                <ItemRow key={it.id} item={it} activeStores={[...filter.stores]} />
              ))}
            </div>
          </section>
        )}
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
          <Scanner onClose={() => setScanOpen(false)} pinToStore={activeStore} />
        </Suspense>
      )}

      {shopOpen && (
        <Suspense fallback={null}>
          <ShopMode
            activeStores={[...filter.stores]}
            pinToStore={activeStore}
            onClose={() => setShopOpen(false)}
          />
        </Suspense>
      )}

      {newListOpen && (
        <Suspense fallback={null}>
          <NewListSheet onClose={() => setNewListOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}

function CategoryHeader({ category, count }: { category: Category; count: number }) {
  return (
    <div className="mb-2 flex items-baseline justify-between px-1">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
        {CATEGORY_LABELS[category]}
      </h2>
      <span className="text-[11px] font-medium tabular-nums text-[var(--color-muted)]">{count}</span>
    </div>
  );
}

/**
 * Sort items into supermarket-walk order. Items within a category keep their
 * existing relative order (position / addedAt — already applied upstream by
 * the items store).
 */
function groupByCategory(items: Item[]): Array<[Category, Item[]]> {
  if (items.length === 0) return [];
  const buckets = new Map<Category, Item[]>();
  for (const it of items) {
    const list = buckets.get(it.category);
    if (list) list.push(it);
    else buckets.set(it.category, [it]);
  }
  const out: Array<[Category, Item[]]> = [];
  for (const cat of CATEGORY_ORDER) {
    const list = buckets.get(cat);
    if (list && list.length > 0) out.push([cat, list]);
  }
  return out;
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
