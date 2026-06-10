import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { SearchBar } from './components/SearchBar';
import { ShelfGroup } from './components/ShelfGroup';
import { ShelfRow } from './components/ShelfRow';
import { OffersToggle } from './components/OffersToggle';
import { OffersView } from './components/OffersView';
import { FilterRow } from './components/FilterRow';
import { FilterSheet } from './components/FilterSheet';
import { ListSwitcher } from './components/ListSwitcher';
import { applyFilter, computeFacets, emptyFilter } from './facets';
import { attachOfferMeta, useOffers } from './offers';
import {
  clearChecked,
  ensureDefaultList,
  setActiveListId,
  useActiveListId,
  useItems,
  useLists,
} from './store';
import { startSyncLoop } from './sync';
import { CATEGORY_ORDER, type Category, type Item } from './types';

const NewListSheet = lazy(() =>
  import('./components/NewListSheet').then((m) => ({ default: m.NewListSheet })),
);

const Scanner = lazy(() => import('./components/Scanner').then((m) => ({ default: m.Scanner })));

const ShopMode = lazy(() =>
  import('./components/ShopMode').then((m) => ({ default: m.ShopMode })),
);

const ListActionSheet = lazy(() =>
  import('./components/ListActionSheet').then((m) => ({ default: m.ListActionSheet })),
);

const JoinShareSheet = lazy(() =>
  import('./components/JoinShareSheet').then((m) => ({ default: m.JoinShareSheet })),
);

export default function App() {
  const items = useItems();
  const lists = useLists();
  const activeListId = useActiveListId();
  const [filter, setFilter] = useState(emptyFilter);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [offersViewOpen, setOffersViewOpen] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const [newListOpen, setNewListOpen] = useState(false);
  const [actionListId, setActionListId] = useState<string | null>(null);
  const [joinCloudId, setJoinCloudId] = useState<string | null>(null);

  useEffect(() => {
    void ensureDefaultList();
    // Sync loop is a no-op for the user until they tap "Teilen" on a list —
    // it iterates shared lists only. Cheap to keep running unconditionally.
    return startSyncLoop();
  }, []);

  // Pick up `#share=<cloudId>` magic-link fragments. Strip the fragment on
  // mount so a reload doesn't re-trigger the join sheet, and trigger again
  // if the hash changes during the session (deep-link from another tab).
  useEffect(() => {
    const read = () => {
      const m = location.hash.match(/^#share=([^&]+)/);
      if (!m) return;
      try {
        const id = decodeURIComponent(m[1]);
        if (id) setJoinCloudId(id);
      } catch {
        // Malformed fragment — ignore.
      }
      history.replaceState(null, '', location.pathname + location.search);
    };
    read();
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);

  const actionList = actionListId ? lists.find((l) => l.id === actionListId) : null;

  // Cached offers blob — used by the Meine % entry pill (count badge) and
  // the OffersView when it's open. We *also* run a Marken-tier join over the
  // user's items so any row that has a matching offer right now gets its
  // `offer` + `offerStore` stamped: ShelfRow then renders a "−N % · Aldi"
  // pill on the row.
  const offersBlob = useOffers();
  const stamped = useMemo(
    () => attachOfferMeta(items, offersBlob.offers),
    [items, offersBlob],
  );
  const facets = useMemo(() => computeFacets(stamped, filter), [stamped, filter]);
  const filtered = useMemo(() => applyFilter(stamped, filter), [stamped, filter]);
  // The single active store, if any — drives per-store brand pinning when
  // adding items, and per-store brand display in rows.
  const activeStore = filter.stores.size === 1 ? [...filter.stores][0] : undefined;

  const open = filtered.filter((it) => !it.checked);
  const done = filtered.filter((it) => it.checked);
  const total = open.length + done.length;
  const progress = total > 0 ? Math.round((done.length / total) * 100) : 0;

  const grouped = useMemo(() => groupByCategory(open), [open]);

  const activeStores = useMemo(() => [...filter.stores], [filter.stores]);

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col">
      <header className="safe-top sticky top-0 z-20 space-y-3 bg-[var(--color-bg)]/90 px-4 pt-4 pb-3 backdrop-blur-md">
        {/* title wheel — list creation lives inside the wheel as the
            trailing "+ Neue Liste" entry (the standalone big-plus button is
            gone; header redesign "Option A+"). */}
        <ListSwitcher
          lists={lists}
          activeListId={activeListId}
          onSwitch={setActiveListId}
          onLongPress={setActionListId}
          onNewList={() => setNewListOpen(true)}
        />

        {/* count + shopping progress bar + Meine % entry. The % pill is
            navigation (opens the Angebote view), so it sits with status —
            not in the filter row. */}
        <div className="flex items-center gap-3">
          <div className="shrink-0 text-xs font-medium text-[var(--color-muted)]">
            <strong className="text-[var(--color-accent-strong)]">{open.length}</strong> offen
            {done.length > 0 ? ` · ${done.length} erledigt` : ''}
          </div>
          <div className="h-[5px] flex-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <OffersToggle count={offersBlob.total} onOpen={() => setOffersViewOpen(true)} />
        </div>

        <SearchBar
          onScanClick={() => setScanOpen(true)}
          onShopModeClick={() => setShopOpen(true)}
          pinToStore={activeStore}
        />

        {/* single control row: pinned filter chip + scrollable store chips
            + removable active-filter chips */}
        <FilterRow
          filter={filter}
          facets={facets}
          onChange={setFilter}
          onOpenSheet={() => setSheetOpen(true)}
        />
      </header>

      <main className="flex-1 px-4 pt-2 pb-32">
        {open.length === 0 && done.length === 0 && (
          <EmptyState filtered={items.length > 0} offersActive={false} />
        )}

        {grouped.map(([category, rows]) => (
          <ShelfGroup key={category} category={category} rows={rows} activeStores={activeStores} />
        ))}

        {done.length > 0 && (
          <section className={grouped.length > 0 ? 'mt-5' : ''}>
            <div className="mb-2 flex items-center justify-between px-1">
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                Erledigt · {done.length}
              </h2>
              <button
                type="button"
                onClick={() => clearChecked()}
                className="rounded-full px-2 py-1 text-xs font-medium text-[var(--color-muted)] active:bg-[var(--color-surface-2)] active:text-[var(--color-text)]"
              >
                Alle entfernen
              </button>
            </div>
            <div
              className="overflow-hidden rounded-2xl bg-[var(--color-surface)] divide-y divide-[var(--color-border)]"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              {done.map((it) => (
                <ShelfRow key={it.id} item={it} activeStores={activeStores} />
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
            activeStores={activeStores}
            pinToStore={activeStore}
            onClose={() => setShopOpen(false)}
          />
        </Suspense>
      )}

      {offersViewOpen && (
        <OffersView
          offers={offersBlob.offers}
          generatedAt={offersBlob.generated_at}
          onClose={() => setOffersViewOpen(false)}
        />
      )}

      {newListOpen && (
        <Suspense fallback={null}>
          <NewListSheet onClose={() => setNewListOpen(false)} />
        </Suspense>
      )}

      {actionList && (
        <Suspense fallback={null}>
          <ListActionSheet list={actionList} onClose={() => setActionListId(null)} />
        </Suspense>
      )}

      {joinCloudId && (
        <Suspense fallback={null}>
          <JoinShareSheet cloudId={joinCloudId} onClose={() => setJoinCloudId(null)} />
        </Suspense>
      )}
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

function EmptyState({ filtered, offersActive }: { filtered: boolean; offersActive: boolean }) {
  return (
    <div
      className="mt-12 rounded-3xl bg-[var(--color-surface)] p-8 text-center"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)]">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-[var(--color-accent)]"
        >
          <path d="M3 4h2l2.5 12h11l2-9H7" />
          <circle cx="9" cy="20" r="1.5" fill="currentColor" />
          <circle cx="17" cy="20" r="1.5" fill="currentColor" />
        </svg>
      </div>
      <p className="text-base font-medium text-[var(--color-text)]">
        {offersActive
          ? 'Keine Angebote auf deiner Liste.'
          : filtered
            ? 'Mit diesen Filtern steht nichts auf der Liste.'
            : 'Deine Liste ist noch leer.'}
      </p>
      {!filtered && !offersActive && (
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Tippe oben, um Produkte hinzuzufügen — oder scanne einen Barcode.
        </p>
      )}
    </div>
  );
}
