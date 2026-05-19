import { deleteItem, toggleChecked, updateQuantity } from '../store';
import type { Item } from '../types';
import { ProductImage } from '../icons';

export function ItemRow({ item }: { item: Item }) {
  return (
    <div
      className={`flex items-center gap-3 overflow-hidden rounded-2xl bg-[var(--color-surface)] p-3 transition-opacity ${
        item.checked ? 'opacity-60' : ''
      }`}
      style={{ boxShadow: 'var(--shadow-sm)' }}
    >
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

      <ProductImage src={item.image} category={item.category} size={44} />

      <div className="min-w-0 flex-1">
        <div className={`truncate text-base font-medium ${item.checked ? 'line-through text-[var(--color-muted)]' : 'text-[var(--color-text)]'}`}>
          {item.name}
        </div>
        {item.brand && (
          <div className="truncate text-xs text-[var(--color-muted)]">{item.brand}</div>
        )}
      </div>

      {item.checked ? (
        <button
          type="button"
          aria-label="Löschen"
          onClick={() => deleteItem(item.id)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--color-muted)] active:bg-[var(--color-danger-soft)] active:text-[var(--color-danger)] transition-press"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
          </svg>
        </button>
      ) : (
        <div className="flex shrink-0 items-center rounded-full bg-[var(--color-surface-2)]">
          <button
            type="button"
            aria-label="Weniger"
            onClick={() => updateQuantity(item.id, -1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-[var(--color-muted-strong)] active:bg-[var(--color-border)] transition-press"
          >
            −
          </button>
          <span className="min-w-[1.5rem] px-0.5 text-center text-base font-semibold tabular-nums text-[var(--color-text)]">
            {item.quantity}
          </span>
          <button
            type="button"
            aria-label="Mehr"
            onClick={() => updateQuantity(item.id, +1)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-lg text-[var(--color-accent)] active:bg-[var(--color-accent-soft)] transition-press"
          >
            +
          </button>
        </div>
      )}
    </div>
  );
}
