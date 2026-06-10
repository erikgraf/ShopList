import type { Category, Item, Store } from '../types';
import { CATEGORY_LABELS } from '../types';
import { COLORS, GLYPH } from '../icons';
import { ShelfRow } from './ShelfRow';

/**
 * ShelfGroup — the "Regale" (shelf) treatment for one category.
 *
 * A tinted aisle band (category colour) is welded to the top of a single white
 * rounded container holding gap-free rows. This is what makes the shop sections
 * read at a glance and reclaims the vertical space the old 2-column grid spent
 * on inter-card gutters and per-card padding.
 *
 * Replaces, per category, the old:
 *   <CategoryHeader/> + <div className="grid grid-cols-2 gap-2"> … </div>
 */
export function ShelfGroup({
  category,
  rows,
  activeStores,
  onOfferClick,
}: {
  category: Category;
  rows: Item[];
  activeStores: Store[];
  onOfferClick?: (item: Item) => void;
}) {
  const [fg, bg] = COLORS[category];
  return (
    <div
      className="mb-3 overflow-hidden rounded-2xl bg-[var(--color-surface)]"
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
      {/* aisle band */}
      <div
        className="flex items-center gap-2.5 px-3.5 py-2"
        style={{ background: bg, color: fg }}
      >
        <span className="shrink-0 text-[15px] leading-none" aria-hidden>
          {GLYPH[category]}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] font-bold tracking-[-0.01em]">
          {CATEGORY_LABELS[category]}
        </span>
        <span
          className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold tabular-nums"
          style={{ background: 'rgba(255,255,255,0.6)', color: fg }}
        >
          {rows.length}
        </span>
      </div>

      {/* gap-free rows, hairline divided */}
      <div className="divide-y divide-[var(--color-border)]">
        {rows.map((it) => (
          <ShelfRow key={it.id} item={it} activeStores={activeStores} onOfferClick={onOfferClick} />
        ))}
      </div>
    </div>
  );
}
