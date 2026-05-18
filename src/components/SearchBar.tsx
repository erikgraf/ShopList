import { useEffect, useMemo, useRef, useState } from 'react';
import { searchCatalog } from '../catalog';
import { searchProducts } from '../openfoodfacts';
import { searchSnapshot } from '../snapshot';
import { addItemFromProduct, useRecent } from '../store';
import { CATEGORY_LABELS, type Category, type Product } from '../types';
import { ProductImage } from '../icons';

interface Suggestion extends Product {
  source: 'recent' | 'catalog' | 'snapshot' | 'off';
}

const MAX_SHOWN = 12;

export function SearchBar({ onScanClick }: { onScanClick: () => void }) {
  const [query, setQuery] = useState('');
  const [snapshotResults, setSnapshotResults] = useState<Product[]>([]);
  const [offResults, setOffResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recent = useRecent();

  useEffect(() => {
    setSelectedCategory(null);
  }, [query]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setSnapshotResults([]);
      return;
    }
    let cancelled = false;
    searchSnapshot(q, 40).then((r) => {
      if (!cancelled) setSnapshotResults(r);
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setOffResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await searchProducts(q);
      if (cancelled) return;
      setOffResults(r);
      setLoading(false);
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const allSuggestions: Suggestion[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const seen = new Set<string>();
    const out: Suggestion[] = [];

    if (q.length >= 1) {
      for (const r of recent) {
        if (r.name.toLowerCase().includes(q) && !seen.has(r.name.toLowerCase())) {
          seen.add(r.name.toLowerCase());
          out.push({ ...r, source: 'recent' });
        }
      }
    }
    for (const p of searchCatalog(q, 20)) {
      if (!seen.has(p.name.toLowerCase())) {
        seen.add(p.name.toLowerCase());
        out.push({ ...p, source: 'catalog' });
      }
    }
    for (const p of snapshotResults) {
      if (!seen.has(p.name.toLowerCase())) {
        seen.add(p.name.toLowerCase());
        out.push({ ...p, source: 'snapshot' });
      }
    }
    for (const p of offResults) {
      if (!seen.has(p.name.toLowerCase())) {
        seen.add(p.name.toLowerCase());
        out.push({ ...p, source: 'off' });
      }
    }
    return out;
  }, [query, offResults, snapshotResults, recent]);

  const categoryCounts = useMemo(() => {
    const map = new Map<Category, number>();
    for (const s of allSuggestions) map.set(s.category, (map.get(s.category) ?? 0) + 1);
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [allSuggestions]);

  const filteredSuggestions = useMemo(() => {
    if (!selectedCategory) return allSuggestions.slice(0, MAX_SHOWN);
    return allSuggestions.filter((s) => s.category === selectedCategory).slice(0, MAX_SHOWN);
  }, [allSuggestions, selectedCategory]);

  const showSuggestions = focused && query.trim().length > 0;

  const addLiteral = async () => {
    const name = query.trim();
    if (!name) return;
    const top = filteredSuggestions[0] ?? allSuggestions[0];
    if (top) {
      await addItemFromProduct(top);
    } else {
      await addItemFromProduct({
        id: `local:custom:${name.toLowerCase()}`,
        name,
        category: 'sonstiges',
      });
    }
    setQuery('');
    inputRef.current?.focus();
  };

  const pick = async (p: Product) => {
    await addItemFromProduct(p);
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-muted)]">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addLiteral();
            }
          }}
          placeholder="Produkt hinzufügen…"
          className="flex-1 py-2 text-base"
          enterKeyHint="done"
          autoCorrect="off"
          autoCapitalize="sentences"
          lang="de"
        />
        <button
          type="button"
          onClick={onScanClick}
          aria-label="Barcode scannen"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] active:scale-95"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 7V5a2 2 0 0 1 2-2h2" />
            <path d="M17 3h2a2 2 0 0 1 2 2v2" />
            <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
            <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
            <path d="M7 8v8M11 8v8M15 8v8M19 8v8" />
          </svg>
        </button>
      </div>

      {showSuggestions && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
          {categoryCounts.length > 1 && (
            <div className="overflow-x-auto border-b border-[var(--color-border)]">
              <div
                className="flex gap-1.5 px-3 py-2"
                onMouseDown={(e) => e.preventDefault()}
              >
                <CategoryChip
                  active={selectedCategory === null}
                  count={allSuggestions.length}
                  onClick={() => setSelectedCategory(null)}
                >
                  Alle
                </CategoryChip>
                {categoryCounts.map(([c, n]) => (
                  <CategoryChip
                    key={c}
                    active={selectedCategory === c}
                    count={n}
                    onClick={() => setSelectedCategory(selectedCategory === c ? null : c)}
                  >
                    {CATEGORY_LABELS[c]}
                  </CategoryChip>
                ))}
              </div>
            </div>
          )}

          {filteredSuggestions.length === 0 && !loading && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={addLiteral}
              className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-[var(--color-surface-2)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">+</div>
              <div>
                <div className="text-base">„{query.trim()}" hinzufügen</div>
                <div className="text-xs text-[var(--color-muted)]">Sonstiges</div>
              </div>
            </button>
          )}
          {loading && filteredSuggestions.length === 0 && (
            <div className="px-4 py-3 text-sm text-[var(--color-muted)]">Suche…</div>
          )}
          <ul className="max-h-[60vh] overflow-y-auto">
            {filteredSuggestions.map((s) => (
              <li key={`${s.source}:${s.id}`}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(s)}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-[var(--color-surface-2)]"
                >
                  <ProductImage src={s.image} category={s.category} size={40} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-base">{s.name}</div>
                    <div className="truncate text-xs text-[var(--color-muted)]">
                      {s.brand ? `${s.brand} · ` : ''}
                      {labelForSource(s.source)}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function CategoryChip({
  active,
  count,
  onClick,
  children,
}: {
  active: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
        active
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-bg)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface-2)] text-[var(--color-text)]'
      }`}
    >
      <span>{children}</span>
      <span
        className={`min-w-[1rem] rounded-full px-1 text-center text-[10px] tabular-nums ${
          active ? 'bg-black/20' : 'bg-[var(--color-bg)] text-[var(--color-muted)]'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function labelForSource(s: Suggestion['source']): string {
  switch (s) {
    case 'recent':
      return 'Zuletzt verwendet';
    case 'catalog':
      return 'Vorschlag';
    case 'snapshot':
      return 'Katalog';
    case 'off':
      return 'Open Food Facts';
  }
}
