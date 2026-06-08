import { useEffect, useMemo, useRef, useState } from 'react';
import { searchCatalog } from '../catalog';
import { searchProducts } from '../openfoodfacts';
import { searchSnapshot } from '../snapshot';
import {
  searchGenerics,
  genericToProduct,
  resolveGeneric,
  rootGeneric,
  getGeneric,
  iconForGeneric,
  type Generic,
} from '../generics';
import { addItemFromProduct, useRecent } from '../store';
import { CATEGORY_LABELS, type Category, type Product, type Store } from '../types';
import { ProductImage } from '../icons';

interface Suggestion extends Product {
  source: 'recent' | 'generic' | 'catalog' | 'snapshot' | 'off';
}

/** A generic header plus the variant/SKU rows that roll up to it. `root` is
 *  null for suggestions that match no generic (OFF long tail, custom items),
 *  which render flat. */
interface SuggestionGroup {
  root: Generic | null;
  rows: Suggestion[];
}

const MAX_SHOWN = 14;

export function SearchBar({
  onScanClick,
  onShopModeClick,
  pinToStore,
}: {
  onScanClick: () => void;
  onShopModeClick: () => void;
  pinToStore?: Store;
}) {
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
    // Generic tier — injected high so the umbrella term and its variants
    // (incl. ones with no catalog SKU yet, e.g. Speisequark 20%) surface and
    // win the name-dedupe over the flat catalog rows for the same concept.
    for (const g of searchGenerics(q, 20)) {
      const p = genericToProduct(g);
      if (!seen.has(p.name.toLowerCase())) {
        seen.add(p.name.toLowerCase());
        out.push({ ...p, source: 'generic' });
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

  const categoryFiltered = useMemo(() => {
    if (!selectedCategory) return allSuggestions;
    return allSuggestions.filter((s) => s.category === selectedCategory);
  }, [allSuggestions, selectedCategory]);

  // Group rows under their root generic so variants nest beneath one header
  // ("Quark" over Speisequark 20%/40%/Magerstufe). Groups keep first-seen
  // order; rows equal to the root are dropped (the header represents them).
  const groups = useMemo<SuggestionGroup[]>(() => {
    const order: (string | null)[] = [];
    const byRoot = new Map<string | null, Suggestion[]>();
    for (const s of categoryFiltered) {
      const gid = s.genericId ?? resolveGeneric(s.name, s.category) ?? undefined;
      const rootId = (rootGeneric(gid) ?? getGeneric(gid))?.id ?? null;
      if (!byRoot.has(rootId)) {
        byRoot.set(rootId, []);
        order.push(rootId);
      }
      byRoot.get(rootId)!.push(s);
    }
    let budget = MAX_SHOWN;
    const out: SuggestionGroup[] = [];
    for (const rootId of order) {
      if (budget <= 0) break;
      const root = rootId ? getGeneric(rootId) ?? null : null;
      const all = byRoot.get(rootId)!;
      // The header IS the umbrella term, so fold in the row that literally
      // repeats it ("Joghurt"). Branded SKUs and variants ("Landliebe
      // Joghurt", "Griechischer Joghurt") have different names and stay as
      // children.
      const rootNameLc = root?.name.trim().toLowerCase();
      const children = root ? all.filter((s) => s.name.trim().toLowerCase() !== rootNameLc) : all;
      const useHeader = !!root && children.length > 0;
      const rows = (useHeader ? children : all).slice(0, Math.max(0, budget - (useHeader ? 1 : 0)));
      if (!useHeader && rows.length === 0) continue;
      budget -= rows.length + (useHeader ? 1 : 0);
      out.push({ root: useHeader ? root : null, rows });
    }
    return out;
  }, [categoryFiltered]);

  const hasResults = groups.some((g) => g.rows.length > 0 || g.root);

  const showSuggestions = focused && query.trim().length > 0;

  const addLiteral = async () => {
    const name = query.trim();
    if (!name) return;
    const top = categoryFiltered[0] ?? allSuggestions[0];
    if (top) {
      await addItemFromProduct(top, { pinToStore });
    } else {
      await addItemFromProduct(
        {
          id: `local:custom:${name.toLowerCase()}`,
          name,
          category: 'sonstiges',
        },
        { pinToStore },
      );
    }
    setQuery('');
    inputRef.current?.focus();
  };

  const pick = async (p: Product) => {
    await addItemFromProduct(p, { pinToStore });
    setQuery('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-2 rounded-2xl bg-[var(--color-surface)] px-3 py-2 transition-shadow ${
          focused ? '' : ''
        }`}
        style={{
          boxShadow: focused ? 'var(--shadow-md), var(--shadow-ring-accent)' : 'var(--shadow-sm)',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--color-muted)]">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          // Some Android IMEs (GBoard predictive, Samsung keyboard) batch
          // keystrokes through composition events and suppress `onChange`
          // until composition ends. Mirror the value here so the dropdown
          // populates even when the user hasn't tapped space yet.
          onCompositionEnd={(e) => setQuery((e.target as HTMLInputElement).value)}
          onFocus={() => setFocused(true)}
          // 250 ms (was 150) gives Android's touch→click sequence enough
          // room to register before the dropdown unmounts. The suggestion
          // buttons also call preventDefault on pointerdown so focus is
          // usually kept anyway; this is the belt-and-suspenders branch
          // for slow devices and back-button-induced blurs.
          onBlur={() => setTimeout(() => setFocused(false), 250)}
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
          // Android Chrome ignores autoCorrect; autoComplete=off + spellCheck=false
          // are the equivalents that actually stop the keyboard from overlaying
          // its own predictive-text strip on top of our suggestion dropdown.
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="sentences"
          lang="de"
        />
        <button
          type="button"
          onClick={onShopModeClick}
          aria-label="Shop-Modus starten"
          title="Shop-Modus"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-surface-2)] text-[var(--color-text)] transition-press active:bg-[var(--color-border)]"
        >
          {/* Shopping bag with a barcode line — distinct from single-shot scan icon */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 8 H19 L18 20 H6 Z" />
            <path d="M9 8 V6 a3 3 0 0 1 6 0 V8" />
            <path d="M9 13 V16" />
            <path d="M12 13 V16" />
            <path d="M15 13 V16" />
          </svg>
        </button>
        <button
          type="button"
          onClick={onScanClick}
          aria-label="Barcode scannen"
          // Soft accent circle instead of the previous solid-green block — the
          // scan trigger is a quiet affordance, not the loudest thing on the
          // bar. The barcode glyph reads as varying-width vertical bars so
          // it's instantly recognisable even at this size.
          className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)] active:bg-[var(--color-accent-soft-hover)] transition-press"
        >
          <svg width="21" height="21" viewBox="0 0 24 24" stroke="currentColor" strokeLinecap="round">
            <line x1="4" y1="6" x2="4" y2="18" strokeWidth="1.6" />
            <line x1="8" y1="6" x2="8" y2="18" strokeWidth="2.6" />
            <line x1="12.5" y1="6" x2="12.5" y2="18" strokeWidth="1.6" />
            <line x1="16" y1="6" x2="16" y2="18" strokeWidth="3" />
            <line x1="20" y1="6" x2="20" y2="18" strokeWidth="1.6" />
          </svg>
        </button>
      </div>

      {showSuggestions && (
        <div
          className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl bg-[var(--color-surface)]"
          style={{ boxShadow: 'var(--shadow-lg)' }}
        >
          {categoryCounts.length > 1 && (
            <div className="overflow-x-auto border-b border-[var(--color-surface-2)]">
              <div
                className="flex gap-1.5 px-3 py-2"
                onPointerDown={(e) => e.preventDefault()}
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

          {!hasResults && !loading && (
            <button
              type="button"
              onPointerDown={(e) => e.preventDefault()}
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
          {loading && !hasResults && (
            <div className="px-4 py-3 text-sm text-[var(--color-muted)]">Suche…</div>
          )}
          {/* `onPointerDown` + preventDefault stops the input from losing
           *  focus when the user taps a suggestion. Pointer events fire early
           *  on touch (Android dispatches mouse events only after touch+click
           *  resolve, too late to keep focus) and cover desktop too. */}
          <ul className="max-h-[60vh] overflow-y-auto">
            {groups.map((group, gi) => {
              const root = group.root;
              return (
                <li key={root ? `gen:${root.id}` : `flat:${gi}`}>
                  {root && (
                    <button
                      type="button"
                      onPointerDown={(e) => e.preventDefault()}
                      onClick={() => pick(genericToProduct(root))}
                      className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-[var(--color-surface-2)]"
                    >
                      <ProductImage category={root.category} iconName={iconForGeneric(root.id)} size={40} eager />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-base font-semibold">{root.name}</div>
                        <div className="truncate text-xs text-[var(--color-muted)]">
                          Sammelbegriff · {CATEGORY_LABELS[root.category]}
                        </div>
                      </div>
                    </button>
                  )}
                  <ul className={root ? 'ml-5 border-l-2 border-[var(--color-surface-2)]' : ''}>
                    {group.rows.map((s) => (
                      <li key={`${s.source}:${s.id}`}>
                        <button
                          type="button"
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={() => pick(s)}
                          className="flex w-full items-center gap-3 px-3 py-2.5 text-left active:bg-[var(--color-surface-2)]"
                        >
                          <ProductImage src={s.image} category={s.category} iconName={s.icon} size={40} eager />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-base">{s.name}</div>
                            {s.brand && (
                              <div className="truncate text-xs text-[var(--color-muted)]">{s.brand}</div>
                            )}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
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
      onPointerDown={(e) => e.preventDefault()}
      className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-press ${
        active
          ? 'bg-[var(--color-accent)] text-white'
          : 'bg-[var(--color-surface-2)] text-[var(--color-text)]'
      }`}
    >
      <span>{children}</span>
      <span
        className={`min-w-[1.1rem] rounded-full px-1.5 text-center text-[10px] font-semibold tabular-nums ${
          active ? 'bg-white/25 text-white' : 'bg-[var(--color-surface)] text-[var(--color-muted)]'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

