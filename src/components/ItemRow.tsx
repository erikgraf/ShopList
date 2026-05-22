import { lazy, Suspense, useState } from 'react';
import { toggleChecked, usePreferences } from '../store';
import { suggestBrand } from '../store-brands';
import { catalogIconFor } from '../catalog';
import type { Item, Store } from '../types';
import { ProductImage } from '../icons';

const QuantitySheet = lazy(() =>
  import('./QuantitySheet').then((m) => ({ default: m.QuantitySheet })),
);
const BrandSheet = lazy(() =>
  import('./BrandSheet').then((m) => ({ default: m.BrandSheet })),
);

export function ItemRow({ item, activeStores }: { item: Item; activeStores: Store[] }) {
  const iconName = item.icon ?? catalogIconFor(item.productId);
  const prefs = usePreferences();
  const [qtyOpen, setQtyOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);

  // Resolve the brand to display:
  //   - With one store filter active: per-store manual pick → suggestion for
  //     that store under current prefs → global brand → empty.
  //     Suggestion is shown muted/italic so the user knows it's a default they
  //     haven't confirmed.
  //   - With no store filter: just the global brand.
  // Multiple active stores aren't possible with the exclusive store filter.
  const singleStore = activeStores.length === 1 ? activeStores[0] : undefined;
  let displayBrand: string | undefined;
  let displaySuggested = false;
  if (singleStore) {
    const pinned = item.brandByStore?.[singleStore];
    if (pinned) {
      displayBrand = pinned;
    } else {
      const sug = suggestBrand(item.name, singleStore, prefs);
      if (sug) {
        displayBrand = sug.brand;
        displaySuggested = true;
      } else if (item.brand) {
        displayBrand = item.brand;
      }
    }
  } else {
    displayBrand = item.brand;
  }

  // Two-line card layout with a dedicated brand column on the right:
  //   - Left: 44 px category-icon tile.
  //   - Centre (flex-1, 2 lines): name on top, quantity pill below — name
  //     gets the full middle width on its own line so things like
  //     "Mineralwasser" or "Hackfleisch" stop truncating to "Mineralw..."
  //   - Right: brand stack — product image on top of the brand name
  //     (vertical) when we have both, else just a small "Marke" / brand-name
  //     pill. Suggestions render in italic without the thumb because the
  //     thumb represents a real picked product, not a default guess.
  // Image moves to the brand stack whenever there's a brand to pair it
  // with; the left tile reverts to the category icon. Items that have only
  // an image (no brand) keep the image on the left as before.
  const hasBrandWithImage =
    !!item.image &&
    !!displayBrand &&
    !displaySuggested &&
    displayBrand === item.brand;
  const leftSrc = hasBrandWithImage ? undefined : item.image;

  return (
    <>
      <div className={`flex items-center gap-2 transition-opacity ${item.checked ? 'opacity-55' : ''}`}>
        <button
          type="button"
          onClick={() => toggleChecked(item.id)}
          aria-label={item.checked ? 'Wieder hinzufügen' : 'Erledigt'}
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-press ${
            item.checked
              ? 'border-[var(--color-success)] bg-[var(--color-success)] text-white'
              : 'border-[var(--color-border-strong)] bg-transparent active:bg-[var(--color-surface-2)]'
          }`}
        >
          {item.checked && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="m5 12 5 5L20 7" />
            </svg>
          )}
        </button>

        <div
          className="flex min-h-[80px] min-w-0 flex-1 items-center gap-3 rounded-2xl bg-[var(--color-surface)] px-3 py-3"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <ProductImage src={leftSrc} category={item.category} iconName={iconName} size={44} />

          <div className="min-w-0 flex-1 flex flex-col gap-1.5">
            <div
              className={`truncate text-[15px] font-medium leading-tight ${
                item.checked ? 'line-through' : ''
              } text-[var(--color-text)]`}
            >
              {item.name}
            </div>
            <button
              type="button"
              onClick={() => setQtyOpen(true)}
              aria-label="Menge ändern"
              className="self-start inline-flex items-center rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-semibold tabular-nums text-[var(--color-text)] active:bg-[var(--color-border)] transition-press"
            >
              ×{item.quantity}
            </button>
          </div>

          {hasBrandWithImage && item.image ? (
            <button
              type="button"
              onClick={() => setBrandOpen(true)}
              aria-label="Marke wählen"
              className="shrink-0 flex flex-col items-center gap-1 max-w-[5.5rem] active:opacity-70 transition-press"
            >
              <img
                src={item.image}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full object-cover"
                style={{ background: '#f1ede4' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
              <span className="truncate w-full text-center text-[10px] font-medium leading-tight text-[var(--color-muted-strong)]">
                {displayBrand}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setBrandOpen(true)}
              aria-label="Marke wählen"
              className={`shrink-0 self-center inline-flex max-w-[5.5rem] items-center gap-1 rounded-full bg-[var(--color-surface-2)] px-2 py-1.5 text-[11px] font-medium active:bg-[var(--color-border)] transition-press ${
                displaySuggested
                  ? 'italic text-[var(--color-muted)]'
                  : 'text-[var(--color-muted-strong)]'
              }`}
            >
              <span className="truncate">{displayBrand ?? 'Marke'}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
          )}
        </div>

        <button
          type="button"
          aria-label="Angebote"
          onClick={() => {
            // TODO: show offers / discounts (see NextSteps.md → Phase D)
          }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-transparent text-[var(--color-muted)] active:bg-[var(--color-surface-2)] transition-press"
        >
          <span className="text-[11px] font-semibold">%</span>
        </button>
      </div>

      {qtyOpen && (
        <Suspense fallback={null}>
          <QuantitySheet item={item} onClose={() => setQtyOpen(false)} />
        </Suspense>
      )}
      {brandOpen && (
        <Suspense fallback={null}>
          <BrandSheet item={item} activeStores={activeStores} onClose={() => setBrandOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
