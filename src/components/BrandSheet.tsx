import { useEffect, useMemo, useState } from 'react';
import { searchSnapshot } from '../snapshot';
import { setBrand, usePreferences } from '../store';
import { suggestBrand, suggestionsForName } from '../store-brands';
import { STORES, type Item, type Store } from '../types';

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

const STORE_LABEL: Record<Store, string> = STORES.reduce(
  (acc, s) => {
    acc[s.id] = s.label;
    return acc;
  },
  {} as Record<Store, string>,
);

export function BrandSheet({ item, activeStores, onClose }: Props) {
  const [options, setOptions] = useState<BrandOption[] | null>(null);
  const prefs = usePreferences();

  // When exactly one store chip is active, BrandSheet writes a per-store
  // pick. Otherwise it falls back to setting the global brand. The chip is
  // also what the suggestion engine is keyed on.
  const targetStore: Store | undefined = activeStores.length === 1 ? activeStores[0] : undefined;

  // What's currently "set" for the active context — used to highlight the
  // active row. With a target store, that's the per-store pick. Otherwise
  // the global brand.
  const currentBrand: string | undefined = targetStore
    ? item.brandByStore?.[targetStore] ?? item.brand
    : item.brand;

  // Curated own-brand suggestions for this item across stores. When the user
  // is at one store, we surface only that one; with no filter we list all
  // chains so the user can grab any of them.
  const curatedSuggestions = useMemo(() => {
    const all = suggestionsForName(item.name, prefs);
    if (targetStore) {
      const sug = suggestBrand(item.name, targetStore, prefs);
      return sug ? [{ store: targetStore, brand: sug.brand, reason: sug.reason }] : [];
    }
    return all;
  }, [item.name, prefs, targetStore]);

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
    await setBrand(item.id, brand, targetStore);
    onClose();
  };

  const headerScope = targetStore ? `für ${STORE_LABEL[targetStore]}` : 'für alle Läden';

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
      <button
        type="button"
        aria-label="Schließen"
        onClick={onClose}
        className="flex-1 bg-black/30 backdrop-blur-sm"
      />
      <div
        className="safe-bottom max-h-[80vh] overflow-y-auto rounded-t-3xl bg-[var(--color-surface)]"
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
          <div className="flex flex-col items-center pt-2">
            <h2 className="text-base font-semibold text-[var(--color-text-strong)]">
              Marke — {item.name}
            </h2>
            <span className="text-[11px] uppercase tracking-[0.08em] text-[var(--color-muted)]">
              {headerScope}
            </span>
          </div>
          <button
            type="button"
            onClick={() => pick(null)}
            className="pt-2 text-sm text-[var(--color-muted)]"
          >
            Keine
          </button>
        </div>

        <div className="space-y-5 p-4">
          {curatedSuggestions.length > 0 && (
            <section>
              <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                Vorschlag
              </h3>
              <ul className="space-y-1.5">
                {curatedSuggestions.map(({ store, brand, reason }) => {
                  const active = currentBrand === brand;
                  return (
                    <li key={`${store}-${brand}`}>
                      <button
                        type="button"
                        onClick={() => pick(brand)}
                        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left text-base transition-press ${
                          active
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                            : 'border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] text-[var(--color-text)] active:bg-[var(--color-border)]'
                        }`}
                      >
                        <span className="flex flex-col">
                          <span className="font-medium">{brand}</span>
                          {!targetStore && (
                            <span
                              className={`text-[11px] ${
                                active ? 'text-white/80' : 'text-[var(--color-muted)]'
                              }`}
                            >
                              {STORE_LABEL[store]}
                              {reason === 'bio' ? ' · Bio' : ''}
                            </span>
                          )}
                          {targetStore && reason === 'bio' && (
                            <span
                              className={`text-[11px] ${
                                active ? 'text-white/80' : 'text-[var(--color-muted)]'
                              }`}
                            >
                              Bio
                            </span>
                          )}
                        </span>
                        {active && (
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="m5 12 5 5L20 7" />
                          </svg>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section>
            {curatedSuggestions.length > 0 && (
              <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                Weitere Marken
              </h3>
            )}
            {!options && (
              <p className="py-6 text-center text-sm text-[var(--color-muted)]">Lade Marken…</p>
            )}
            {options && options.length === 0 && curatedSuggestions.length === 0 && (
              <p className="py-6 text-center text-sm text-[var(--color-muted)]">
                Keine bekannten Marken für „{item.name}".
              </p>
            )}
            {options && options.length > 0 && (
              <ul className="space-y-1.5">
                {options.map(({ brand }) => {
                  const active = currentBrand === brand;
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
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.5"
                          >
                            <path d="m5 12 5 5L20 7" />
                          </svg>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
