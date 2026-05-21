import { lazy, Suspense, useState } from 'react';
import { toggleChecked } from '../store';
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
  const [qtyOpen, setQtyOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);

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
          className="flex min-w-0 flex-1 items-center gap-2.5 rounded-2xl bg-[var(--color-surface)] p-2.5"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <ProductImage src={item.image} category={item.category} iconName={iconName} size={40} />

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
            className="flex shrink-0 max-w-[5.5rem] items-center gap-1 rounded-full bg-[var(--color-surface-2)] px-2 py-1.5 text-[11px] font-medium text-[var(--color-muted-strong)] active:bg-[var(--color-border)] transition-press"
          >
            <span className="truncate">{item.brand ?? 'Marke'}</span>
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
