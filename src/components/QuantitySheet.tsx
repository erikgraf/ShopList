import { useEffect, useRef, useState } from 'react';
import { setQuantity } from '../store';
import type { Item } from '../types';

interface Props {
  item: Item;
  onClose: () => void;
}

const ITEM_HEIGHT = 44;
const VISIBLE_COUNT = 5;
const MAX = 50;
const VALUES = Array.from({ length: MAX }, (_, i) => i + 1);

export function QuantitySheet({ item, onClose }: Props) {
  const [value, setValue] = useState(item.quantity);
  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollTimer = useRef<number | undefined>(undefined);

  // Center the initial value on open.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.max(0, Math.min(MAX - 1, item.quantity - 1));
    el.scrollTop = idx * ITEM_HEIGHT;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock body scroll while sheet is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollTop / ITEM_HEIGHT);
    const next = VALUES[Math.max(0, Math.min(MAX - 1, idx))];
    if (next !== value) setValue(next);
    // Debounce: snap to nearest after scrolling stops.
    if (scrollTimer.current) window.clearTimeout(scrollTimer.current);
    scrollTimer.current = window.setTimeout(() => {
      const snappedTop = idx * ITEM_HEIGHT;
      if (Math.abs(el.scrollTop - snappedTop) > 0.5) {
        el.scrollTo({ top: snappedTop, behavior: 'smooth' });
      }
    }, 120);
  };

  const confirm = async () => {
    await setQuantity(item.id, value);
    onClose();
  };

  const quickPick = async (n: number) => {
    await setQuantity(item.id, n);
    onClose();
  };

  const sizeLabel = (n: number): string | null => {
    if (n === 6) return 'Sixpack';
    if (n === 24) return 'Kasten';
    return null;
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
        className="safe-bottom rounded-t-3xl bg-[var(--color-surface)]"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="relative flex items-center justify-between border-b border-[var(--color-surface-2)] px-5 pt-4 pb-3">
          <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-[var(--color-border-strong)]" />
          <button
            type="button"
            onClick={onClose}
            className="pt-2 text-sm text-[var(--color-muted)]"
          >
            Abbrechen
          </button>
          <h2 className="pt-2 text-base font-semibold text-[var(--color-text-strong)]">
            Menge — {item.name}
          </h2>
          <button
            type="button"
            onClick={confirm}
            className="pt-2 text-sm font-semibold text-[var(--color-accent)]"
          >
            Fertig
          </button>
        </div>

        {item.sizes && item.sizes.length > 0 && (
          <div className="border-b border-[var(--color-surface-2)] px-5 pt-3 pb-4">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
              Gängige Größen
            </div>
            <div className="flex flex-wrap gap-2">
              {item.sizes.map((n) => {
                const label = sizeLabel(n);
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => quickPick(n)}
                    className="flex items-center gap-1.5 rounded-full bg-[var(--color-surface-2)] px-3.5 py-1.5 text-sm font-medium text-[var(--color-text)] active:bg-[var(--color-border)] transition-press"
                  >
                    <span className="tabular-nums">×{n}</span>
                    {label && (
                      <span className="text-[11px] text-[var(--color-muted)]">· {label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="relative py-4">
          {/* center band */}
          <div
            className="pointer-events-none absolute inset-x-5 top-1/2 -translate-y-1/2 rounded-2xl bg-[var(--color-accent-soft)]"
            style={{ height: ITEM_HEIGHT }}
          />
          {/* fade overlays top + bottom */}
          <div
            className="pointer-events-none absolute inset-x-0 top-4 z-10 h-12"
            style={{
              background:
                'linear-gradient(to bottom, var(--color-surface) 0%, transparent 100%)',
            }}
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-4 z-10 h-12"
            style={{
              background:
                'linear-gradient(to top, var(--color-surface) 0%, transparent 100%)',
            }}
          />
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="overflow-y-scroll scroll-smooth"
            style={{
              height: ITEM_HEIGHT * VISIBLE_COUNT,
              scrollSnapType: 'y mandatory',
              scrollPaddingTop: ITEM_HEIGHT * Math.floor(VISIBLE_COUNT / 2),
            }}
          >
            <div style={{ height: ITEM_HEIGHT * Math.floor(VISIBLE_COUNT / 2) }} />
            {VALUES.map((n) => (
              <div
                key={n}
                style={{
                  height: ITEM_HEIGHT,
                  scrollSnapAlign: 'center',
                  scrollSnapStop: 'always',
                }}
                className={`flex items-center justify-center tabular-nums transition-all ${
                  value === n
                    ? 'text-[28px] font-semibold text-[var(--color-accent-strong)]'
                    : 'text-[18px] text-[var(--color-muted)]'
                }`}
              >
                ×{n}
              </div>
            ))}
            <div style={{ height: ITEM_HEIGHT * Math.floor(VISIBLE_COUNT / 2) }} />
          </div>
        </div>
      </div>
    </div>
  );
}
