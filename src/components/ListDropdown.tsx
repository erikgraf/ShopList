import { useEffect, useMemo, useRef, useState } from 'react';
import type { ShopList } from '../types';

interface Props {
  lists: ShopList[];
  activeListId: string;
  onSwitch: (id: string) => void;
  /** Opens the ListActionSheet (Umbenennen / Teilen / Löschen) for a list —
   *  reached via the per-row ellipsis inside the dropdown. */
  onOpenActions: (id: string) => void;
  /** Opens the NewListSheet — the trailing "Neue Liste" row. */
  onNewList: () => void;
}

/**
 * ListDropdown — the list switcher in the header title row.
 *
 * Replaces the horizontal scroll-snap wheel: a wheel hides the other lists
 * until you drag, couples switching to scroll physics, and needed a
 * long-press for actions. The dropdown shows everything in one tap:
 *
 *   Einkaufsliste ⌄
 *   ┌──────────────────────────┐
 *   │ ⇧ Einkaufsliste        ✓ │  ← tap row = switch
 *   │ ⇧ Wocheneinkauf      ··· │  ← ellipsis = actions sheet
 *   │ ───────────────────────  │
 *   │ + Neue Liste             │
 *   └──────────────────────────┘
 *
 * The trigger keeps the big title typography so the header reads the same;
 * the chevron signals the affordance the wheel never had.
 */
export function ListDropdown({ lists, activeListId, onSwitch, onOpenActions, onNewList }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const ordered = useMemo(() => [...lists].sort((a, b) => a.position - b.position), [lists]);
  const active = ordered.find((l) => l.id === activeListId);

  // Close on Escape — cheap to add, helps desktop PWA use.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="inline-flex max-w-full items-center gap-1.5 transition-press active:opacity-70"
      >
        <ShareIndicator shared={!!active?.cloud} size={16} />
        <span className="truncate text-2xl font-semibold tracking-tight text-[var(--color-text-strong)]">
          {active?.name ?? 'Einkaufsliste'}
        </span>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
          className={`shrink-0 text-[var(--color-muted)] transition-transform duration-150 ${
            open ? 'rotate-180' : ''
          }`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <>
          {/* invisible backdrop — tap anywhere outside to close */}
          <button
            type="button"
            aria-label="Schließen"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div
            role="listbox"
            aria-label="Listen"
            className="absolute left-0 top-full z-20 mt-2 min-w-[248px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-[var(--color-surface)] py-1"
            style={{ boxShadow: 'var(--shadow-lg)' }}
          >
            {ordered.map((l) => {
              const isActive = l.id === activeListId;
              return (
                <div key={l.id} className="flex items-center">
                  <button
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      onSwitch(l.id);
                      setOpen(false);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2.5 px-4 py-3 text-left transition-press active:bg-[var(--color-surface-2)]"
                  >
                    <ShareIndicator shared={!!l.cloud} size={14} />
                    <span
                      className={`min-w-0 flex-1 truncate text-[15.5px] ${
                        isActive
                          ? 'font-semibold text-[var(--color-text-strong)]'
                          : 'font-medium text-[var(--color-text)]'
                      }`}
                    >
                      {l.name}
                    </span>
                    {isActive && (
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--color-accent)"
                        strokeWidth="2.6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                        className="shrink-0"
                      >
                        <path d="m5 12 5 5L20 7" />
                      </svg>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      onOpenActions(l.id);
                    }}
                    aria-label={`${l.name}: Optionen`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center text-[var(--color-muted)] transition-press active:bg-[var(--color-surface-2)]"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <circle cx="5" cy="12" r="1.7" />
                      <circle cx="12" cy="12" r="1.7" />
                      <circle cx="19" cy="12" r="1.7" />
                    </svg>
                  </button>
                </div>
              );
            })}

            <div className="mx-4 my-1 h-px bg-[var(--color-border)]" aria-hidden />

            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onNewList();
              }}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[15px] font-semibold text-[var(--color-accent)] transition-press active:bg-[var(--color-surface-2)]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                aria-hidden
                className="shrink-0"
              >
                <path d="M12 5v14" />
                <path d="M5 12h14" />
              </svg>
              <span>Neue Liste</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Tiny visual cue next to a list name: greyish when the list is local-only,
 * accent-green when it's been shared via cloud sync.
 */
function ShareIndicator({ shared, size }: { shared: boolean; size: number }) {
  const color = shared ? 'var(--color-accent)' : 'var(--color-muted)';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-label={shared ? 'Geteilt' : 'Nicht geteilt'}
      style={{ flexShrink: 0 }}
    >
      <path d="M12 3v13" />
      <path d="m8 7 4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}
