import { useEffect, useRef } from 'react';
import type { ShopList } from '../types';

interface Props {
  lists: ShopList[];
  activeListId: string;
  onSwitch: (id: string) => void;
  onCreateNew: () => void;
  /** Tap-and-hold a list title for ~500 ms to open its action sheet
   *  (Umbenennen / Teilen / Löschen). Optional. */
  onLongPress?: (id: string) => void;
}

const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_TOLERANCE = 8;

/**
 * Horizontal wheel of list titles. Center item is the active list.
 * - Tap an inactive list → switches to it.
 * - Tap the active (centered) title → opens "new list" sheet.
 * - Scroll horizontally → snaps to the next list (which becomes active).
 * - Long-press any list title → fires `onLongPress(id)` (action sheet).
 *
 * Spacers at start and end let the first/last list center properly even though
 * the snap container is wider than the viewport.
 */
export function ListSwitcher({ lists, activeListId, onSwitch, onCreateNew, onLongPress }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const lastReportedRef = useRef<string>(activeListId);
  const programmaticScrollRef = useRef(false);
  const programmaticTimerRef = useRef<number | undefined>(undefined);

  // Scroll to the active list whenever it changes from outside (e.g. on mount,
  // or after creating a new list). Use instant scroll so the scroll-detection
  // handler doesn't fire mid-animation and bounce the active list back.
  useEffect(() => {
    const el = scrollRef.current;
    const node = itemRefs.current.get(activeListId);
    if (!el || !node) return;
    const center = node.offsetLeft + node.offsetWidth / 2 - el.clientWidth / 2;
    programmaticScrollRef.current = true;
    el.scrollTo({ left: center, behavior: 'auto' });
    lastReportedRef.current = activeListId;
    // Briefly ignore scroll events that fire as a consequence of this jump.
    if (programmaticTimerRef.current) window.clearTimeout(programmaticTimerRef.current);
    programmaticTimerRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 100);
  }, [activeListId, lists.length]);

  // While the user scrolls, find the item nearest to the viewport's horizontal
  // center and treat that as "active". Debounced via rAF.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      if (frame || programmaticScrollRef.current) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const viewportCenter = el.scrollLeft + el.clientWidth / 2;
        let best: { id: string; dist: number } | null = null;
        for (const [id, node] of itemRefs.current.entries()) {
          const itemCenter = node.offsetLeft + node.offsetWidth / 2;
          const dist = Math.abs(itemCenter - viewportCenter);
          if (!best || dist < best.dist) best = { id, dist };
        }
        if (best && best.id !== lastReportedRef.current) {
          lastReportedRef.current = best.id;
          onSwitch(best.id);
        }
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [onSwitch, lists]);

  // Long-press machinery. Pointer events start a 500 ms timer; if the pointer
  // moves more than 8 px before it fires we cancel — treat that as scroll
  // intent so the horizontal wheel still works. When the timer fires, we set
  // a flag that the click handler reads to swallow the upcoming tap.
  const longPressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const longPressStart = useRef({ x: 0, y: 0 });

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const startLongPress = (id: string, x: number, y: number) => {
    if (!onLongPress) return;
    cancelLongPress();
    longPressStart.current = { x, y };
    longPressTimer.current = window.setTimeout(() => {
      longPressFired.current = true;
      longPressTimer.current = null;
      if ('vibrate' in navigator) navigator.vibrate(20);
      onLongPress(id);
    }, LONG_PRESS_MS);
  };

  const moveLongPress = (x: number, y: number) => {
    const dx = Math.abs(x - longPressStart.current.x);
    const dy = Math.abs(y - longPressStart.current.y);
    if (dx > LONG_PRESS_MOVE_TOLERANCE || dy > LONG_PRESS_MOVE_TOLERANCE) {
      cancelLongPress();
    }
  };

  const handleTap = (id: string) => {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    if (id === activeListId) {
      onCreateNew();
    } else {
      onSwitch(id);
    }
  };

  return (
    <div
      ref={scrollRef}
      className="-mx-4 overflow-x-auto"
      style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
    >
      <div className="flex w-max items-baseline gap-7">
        <div className="shrink-0" style={{ minWidth: '50vw' }} aria-hidden />
        {lists.map((l) => {
          const active = l.id === activeListId;
          return (
            <div
              key={l.id}
              ref={(node) => {
                if (node) itemRefs.current.set(l.id, node);
                else itemRefs.current.delete(l.id);
              }}
              className="shrink-0 inline-flex items-baseline gap-1.5 py-1"
              style={{ scrollSnapAlign: 'center', scrollSnapStop: 'always' }}
            >
              {/* Share-state icon is its own button so tapping it opens the
                  action sheet (where Teilen lives) instead of bubbling up to
                  the title button — which on the active list would open
                  "Neue Liste". */}
              <button
                type="button"
                onClick={() => onLongPress?.(l.id)}
                aria-label={l.cloud ? 'Geteilt — Optionen' : 'Teilen'}
                className="-mx-1 -my-0.5 inline-flex items-baseline px-1 py-0.5 active:opacity-60 transition-press"
              >
                <ShareIndicator shared={!!l.cloud} active={active} />
              </button>
              <button
                type="button"
                onClick={() => handleTap(l.id)}
                onPointerDown={(e) => startLongPress(l.id, e.clientX, e.clientY)}
                onPointerMove={(e) => moveLongPress(e.clientX, e.clientY)}
                onPointerUp={cancelLongPress}
                onPointerCancel={cancelLongPress}
                onPointerLeave={cancelLongPress}
                onContextMenu={(e) => {
                  if (onLongPress) e.preventDefault();
                }}
                className="whitespace-nowrap transition-all"
              >
                <span
                  className={
                    active
                      ? 'text-2xl font-semibold tracking-tight text-[var(--color-text-strong)]'
                      : 'text-base text-[var(--color-muted)]'
                  }
                >
                  {l.name}
                </span>
              </button>
            </div>
          );
        })}
        <button
          type="button"
          onClick={onCreateNew}
          className="shrink-0 whitespace-nowrap py-1 text-base text-[var(--color-accent)]"
          style={{ scrollSnapAlign: 'center' }}
        >
          + Neue Liste
        </button>
        <div className="shrink-0" style={{ minWidth: '50vw' }} aria-hidden />
      </div>
    </div>
  );
}

/**
 * Tiny visual cue next to each list title in the wheel: greyish when the
 * list is local-only, accent-green when it's been shared via the cloud
 * sync. Sits inline-baseline so it doesn't push the title around. Purely
 * decorative — sharing is still triggered through the long-press action
 * sheet on the title.
 */
function ShareIndicator({ shared, active }: { shared: boolean; active: boolean }) {
  const size = active ? 16 : 12;
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
      style={{ flexShrink: 0, alignSelf: 'center' }}
    >
      <path d="M12 3v13" />
      <path d="m8 7 4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}
