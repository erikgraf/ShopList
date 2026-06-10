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

/**
 * ShelfRow — the single-column "Regale" row.
 *
 * Adaptive height by information density (this is the key idea):
 *   • Generic / typed item (no product photo) → compact one-line row.
 *     Brand, if any, trails the name muted. Minimal vertical footprint so a
 *     long list scans fast while walking the aisle.
 *   • Barcode-scanned item (has item.image from Open Food Facts) → taller
 *     "rich" row with the real product thumbnail and the brand on its own
 *     line. The extra height signals "this is a confirmed, specific SKU".
 *
 * `item.image` is the rich signal: a real photo only exists after a scan or a
 * catalog hit, which is exactly when the richer row is warranted. No new data
 * field required.
 *
 * Brand resolution, qty pill, and brand pill behaviour are carried over 1:1
 * from the original ItemRow so the store-aware brand suggestions keep working.
 */
export function ShelfRow({
  item,
  activeStores,
  onOfferClick,
}: {
  item: Item;
  activeStores: Store[];
  /** Tapping the offer line opens the replace-with-offer sheet. Omitted on
   *  the done/erledigt list where swapping a bought item makes no sense. */
  onOfferClick?: (item: Item) => void;
}) {
  const iconName = item.icon ?? catalogIconFor(item.productId);
  const prefs = usePreferences();
  const [qtyOpen, setQtyOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);

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

  const rich = !!item.image;

  return (
    <>
      <div
        className={`flex items-center gap-3 px-3.5 transition-opacity ${
          rich ? 'py-2.5' : 'py-2'
        } ${item.checked ? 'opacity-55' : ''}`}
      >
        {/* check */}
        <button
          type="button"
          onClick={() => toggleChecked(item.id)}
          aria-label={item.checked ? 'Wieder hinzufügen' : 'Erledigt'}
          className={`flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-2 transition-press ${
            item.checked
              ? 'border-[var(--color-success)] bg-[var(--color-success)] text-white'
              : 'border-[var(--color-border-strong)] bg-transparent active:bg-[var(--color-surface-2)]'
          }`}
        >
          {item.checked && (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2">
              <path d="m5 12 5 5L20 7" />
            </svg>
          )}
        </button>

        {/* rich rows show the real product thumbnail; compact rows stay text-only */}
        {rich && (
          <ProductImage src={item.image} category={item.category} iconName={iconName} size={44} />
        )}

        {/* body */}
        <div className="min-w-0 flex-1">
          {rich ? (
            <>
              <div
                className={`truncate text-[15.5px] font-medium leading-tight text-[var(--color-text)] ${
                  item.checked ? 'line-through' : ''
                }`}
              >
                {item.name}
              </div>
              {displayBrand && (
                <button
                  type="button"
                  onClick={() => setBrandOpen(true)}
                  aria-label="Marke wählen"
                  className={`mt-0.5 block min-w-0 max-w-full truncate text-[12px] ${
                    displaySuggested ? 'italic text-[var(--color-muted)]' : 'text-[var(--color-muted)]'
                  }`}
                >
                  {displayBrand}
                </button>
              )}
            </>
          ) : (
            <div
              className={`truncate text-[15.5px] font-medium leading-tight text-[var(--color-text)] ${
                item.checked ? 'line-through' : ''
              }`}
            >
              {item.name}
              {displayBrand && (
                <button
                  type="button"
                  onClick={() => setBrandOpen(true)}
                  className="text-[0.82em] font-normal text-[var(--color-muted)]"
                >
                  {' · '}
                  {displayBrand}
                </button>
              )}
            </div>
          )}

          {/* Dedicated offer line under the name/brand. Mint-coral accent
              so the deal pops without shouting; carries store + sale price
              + savings + discount %. Only rendered when there's a match. */}
          {item.offer ? (
            <OfferLine
              percent={item.offer}
              store={item.offerStore}
              price={item.offerPrice}
              savings={item.offerSavings}
              onClick={
                onOfferClick
                  ? (e) => {
                      e.stopPropagation();
                      onOfferClick(item);
                    }
                  : undefined
              }
            />
          ) : null}
        </div>

        {/* quantity stepper — inline, no sheet needed for ±1; tap the number to
            open the full QuantitySheet for units / pack sizes. */}
        <div
          className="flex shrink-0 items-center gap-0.5 rounded-full bg-[var(--color-surface-2)] p-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Weniger"
            disabled={item.quantity <= 1}
            onClick={() => setQtyOpen(true)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text)] active:bg-[var(--color-border)] disabled:text-[var(--color-border-strong)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M5 12h14" /></svg>
          </button>
          <button
            type="button"
            onClick={() => setQtyOpen(true)}
            aria-label="Menge ändern"
            className="min-w-[28px] px-0.5 text-center text-[13px] font-bold tabular-nums text-[var(--color-text)]"
          >
            {item.quantity}
            {item.unit && item.unit !== 'Stk' ? (
              <span className="ml-0.5 text-[11px] font-medium text-[var(--color-muted)]">{item.unit}</span>
            ) : null}
          </button>
          <button
            type="button"
            aria-label="Mehr"
            onClick={() => setQtyOpen(true)}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-text)] active:bg-[var(--color-border)]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14" /><path d="M5 12h14" /></svg>
          </button>
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

/** Dedicated row-level offer ribbon. Sits under name/brand and shows
 *  everything the user needs to decide "is this deal worth it?" at a glance:
 *  the store, the current sale price, the euro savings, and the discount %.
 *  Uses the offer-soft accent so it reads as a unit and doesn't compete with
 *  the row's primary content for attention. */
function OfferLine({
  percent,
  store,
  price,
  savings,
  onClick,
}: {
  percent: number;
  store?: string;
  price?: number;
  savings?: number;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const fmtEur = (n: number) => `€${n.toFixed(2).replace('.', ',')}`;
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-label={onClick ? 'Angebot übernehmen' : undefined}
      className={`mt-1 inline-flex w-fit max-w-full flex-wrap items-center gap-x-1.5 gap-y-0.5 rounded-md bg-[var(--color-offer-soft)] px-1.5 py-0.5 text-[11.5px] font-semibold text-[var(--color-offer)] ${
        onClick ? 'transition-press active:opacity-70' : ''
      }`}
    >
      {store && (
        <span className="inline-flex items-center gap-1">
          <span
            aria-hidden
            className="h-[6px] w-[6px] shrink-0 rounded-full"
            style={{ background: STORE_DOT[store] ?? 'currentColor' }}
          />
          <span>{STORE_LABEL[store] ?? store}</span>
        </span>
      )}
      {price !== undefined && (
        <>
          <span aria-hidden className="opacity-50">·</span>
          <span className="font-extrabold tabular-nums">{fmtEur(price)}</span>
        </>
      )}
      {savings !== undefined && savings > 0 && (
        <>
          <span aria-hidden className="opacity-50">·</span>
          <span className="tabular-nums">Spare {fmtEur(savings)}</span>
        </>
      )}
      <>
        <span aria-hidden className="opacity-50">·</span>
        <span className="tabular-nums">−{percent}&thinsp;%</span>
      </>
    </Tag>
  );
}

// Small mirror of the StoreChips brand-dot palette so the offer pill on the
// row reads as "the same store" as the chip without importing the chip itself.
const STORE_LABEL: Record<string, string> = {
  aldi: 'Aldi', dm: 'DM', rewe: 'Rewe', edeka: 'Edeka', lidl: 'Lidl',
  netto: 'Netto', kaufland: 'Kaufland', rossmann: 'Rossmann',
};
const STORE_DOT: Record<string, string> = {
  aldi:    'var(--store-aldi, #1b4a9c)',
  dm:      'var(--store-dm, #0a2a6b)',
  rewe:    'var(--store-rewe, #cc0a1e)',
  edeka:   'var(--store-edeka, #1f72b8)',
  lidl:    'var(--store-lidl, #0a5bb5)',
  netto:   '#ffd400',
  kaufland:'#e10915',
  rossmann:'var(--store-rossmann, #c4022e)',
};
