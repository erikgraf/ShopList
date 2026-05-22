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

  // Barcode scans give us both a brand and a real OFF product image. Show the
  // generic icon on the left of the row (cleaner visual identity for the
  // category), and tuck the product image inside the brand pill on the right
  // so the row clearly says "Handcreme" / "Kamill" with the Kamill jar
  // thumbnail next to the brand name. For typed/searched items (no barcode),
  // the image stays on the left as before — that's the catalogued visual.
  const isScanned = !!item.barcode;
  const hasBrandThumb =
    isScanned && !!item.image && !!displayBrand && !displaySuggested && displayBrand === item.brand;
  const leftSrc = isScanned ? undefined : item.image;

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
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl bg-[var(--color-surface)] px-2.5 py-[18px]"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <ProductImage src={leftSrc} category={item.category} iconName={iconName} size={40} />

          <div className="min-w-0 flex-1">
            <div
              className={`truncate text-[15px] font-medium leading-tight ${
                item.checked ? 'line-through' : ''
              } text-[var(--color-text)]`}
            >
              {item.name}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setQtyOpen(true)}
            aria-label="Menge ändern"
            className="flex shrink-0 items-center rounded-full bg-[var(--color-surface-2)] px-3 py-1.5 text-sm font-semibold tabular-nums text-[var(--color-text)] active:bg-[var(--color-border)] transition-press"
          >
            ×{item.quantity}
          </button>

          <button
            type="button"
            onClick={() => setBrandOpen(true)}
            aria-label="Marke wählen"
            className={`flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-surface-2)] py-1.5 text-[11px] font-medium active:bg-[var(--color-border)] transition-press ${
              hasBrandThumb ? 'max-w-[7.5rem] pl-1 pr-2' : 'max-w-[5.5rem] px-2'
            } ${
              displaySuggested
                ? 'italic text-[var(--color-muted)]'
                : 'text-[var(--color-muted-strong)]'
            }`}
          >
            {hasBrandThumb && item.image && (
              <img
                src={item.image}
                alt=""
                className="h-6 w-6 shrink-0 rounded-full object-cover"
                style={{ background: '#f1ede4' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <span className="truncate">{displayBrand ?? 'Marke'}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
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
