import { useEffect, useState } from 'react';
import { searchSnapshot } from '../snapshot';
import { setBrand } from '../store';
import type { Item, Store } from '../types';

interface Props {
  item: Item;
  activeStores: Store[];
  onClose: () => void;
}

interface BrandOption {
  brand: string;
  /** How many snapshot rows match this brand for the active context — used as a soft popularity signal. */
  rank: number;
}

export function BrandSheet({ item, activeStores, onClose }: Props) {
  const [options, setOptions] = useState<BrandOption[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    searchSnapshot(item.name, 60).then((results) => {
      if (cancelled) return;
      const counts = new Map<string, number>();
      for (const r of results) {
        if (!r.brand) continue;
        if (activeStores.length > 0 && !r.stores?.some((s) => activeStores.includes(s))) continue;
        counts.set(r.brand, (counts.get(r.brand) ?? 0) + 1);
      }
      const sorted: BrandOption[] = [...counts.entries()]
        .map(([brand, rank]) => ({ brand, rank }))
        .sort((a, b) => b.rank - a.rank)
        .slice(0, 30);
      setOptions(sorted);
    });
    return () => {
      cancelled = true;
    };
  }, [item.name, activeStores]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const pick = async (brand: string | null) => {
    await setBrand(item.id, brand);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        className="flex-1 bg-black/30 backdrop-blur-sm"
      />
      <div
        className="safe-bottom max-h-[75vh] overflow-y-auto rounded-t-3xl bg-[var(--color-surface)]"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--color-surface-2)] bg-[var(--color-surface)] px-5 pt-4 pb-3">
          <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-[var(--color-border-strong)]" />
          <button
            type="button"
            onClick={onClose}
            className="pt-2 text-sm text-[var(--color-muted)]"
          >
            Abbrechen
          </button>
          <h2 className="pt-2 text-base font-semibold text-[var(--color-text-strong)]">
            Marke — {item.name}
          </h2>
          <button
            type="button"
            onClick={() => pick(null)}
            className="pt-2 text-sm text-[var(--color-muted)]"
          >
            Keine
          </button>
        </div>

        <div className="p-4">
          {!options && (
            <p className="py-6 text-center text-sm text-[var(--color-muted)]">Lade Marken…</p>
          )}
          {options && options.length === 0 && (
            <p className="py-6 text-center text-sm text-[var(--color-muted)]">
              Keine bekannten Marken für „{item.name}".
            </p>
          )}
          {options && options.length > 0 && (
            <ul className="space-y-1.5">
              {options.map(({ brand }) => {
                const active = item.brand === brand;
                return (
                  <li key={brand}>
                    <button
                      type="button"
                      onClick={() => pick(brand)}
                      className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-base transition-press ${
                        active
                          ? 'bg-[var(--color-accent)] text-white'
                          : 'bg-[var(--color-surface-2)] text-[var(--color-text)] active:bg-[var(--color-border)]'
                      }`}
                    >
                      <span>{brand}</span>
                      {active && (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="m5 12 5 5L20 7" />
                        </svg>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
