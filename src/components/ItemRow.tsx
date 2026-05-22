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

  // Layout: name gets line 1 with the full middle width; qty pill + brand
  // pill share line 2. The image-on-top-of-brand vertical stack was
  // eating ~90 px from the name area, which truncated long German
  // compounds like "Hackfleisch gemischt" — putting them on separate
  // rows buys back the room. The brand pill still carries a small
  // product thumb when one exists, just inline left of the brand label.
  //
  // The outer "%" button got dropped: it was a placeholder for the
  // offers/Reduktion feature parked in NextSteps. Reclaiming that 36 px
  // of right-edge width is what makes "Mineralwasser" / "Spülmittel"
  // breathe. The feature can come back as a chip in the brand row or a
  // long-press menu when we actually have price data to show.
  const hasBrandWithImage =
    !!item.image &&
    !!displayBrand &&
    !displaySuggested &&
    displayBrand === item.brand;
  // Real product image always lives in the brand chip on line 2 (paired
  // with the brand name). The left tile stays as the generic category
  // icon — except for items that have an image but no brand (rare:
  // search hit with no brand info), where putting it on the left is
  // still useful as a visual cue.
  const leftSrc = hasBrandWithImage || displayBrand ? undefined : item.image;

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
          className="flex min-h-[76px] min-w-0 flex-1 items-center gap-3 rounded-2xl bg-[var(--color-surface)] px-3 py-3"
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
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setQtyOpen(true)}
                aria-label="Menge ändern"
                className="shrink-0 inline-flex items-center rounded-full bg-[var(--color-surface-2)] px-2.5 py-1 text-xs font-semibold tabular-nums text-[var(--color-text)] active:bg-[var(--color-border)] transition-press"
              >
                ×{item.quantity}
              </button>
              <button
                type="button"
                onClick={() => setBrandOpen(true)}
                aria-label="Marke wählen"
                className={`min-w-0 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-2)] py-1 text-[11px] font-medium active:bg-[var(--color-border)] transition-press ${
                  hasBrandWithImage ? 'pl-1 pr-2' : 'px-2.5'
                } ${
                  displaySuggested
                    ? 'italic text-[var(--color-muted)]'
                    : 'text-[var(--color-muted-strong)]'
                }`}
              >
                {hasBrandWithImage && item.image && (
                  <img
                    src={item.image}
                    alt=""
                    className="h-5 w-5 shrink-0 rounded-full object-cover"
                    style={{ background: '#f1ede4' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <span className="truncate">{displayBrand ?? 'Marke'}</span>
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="shrink-0"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
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
