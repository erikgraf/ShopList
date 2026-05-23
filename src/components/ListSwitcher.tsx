import { useEffect, useMemo, useRef } from 'react';
import type { ShopList } from '../types';

interface Props {
  lists: ShopList[];
  activeListId: string;
  onSwitch: (id: string) => void;
  /** Tap-and-hold a list title for ~500 ms to open its action sheet
   *  (Umbenennen / Teilen / Löschen). Tapping the active title also fires
   *  this, since the inline "Neue Liste" entry was moved to a dedicated
   *  button outside the wheel. Optional. */
  onLongPress?: (id: string) => void;
}

const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_TOLERANCE = 8;

/**
 * Horizontal strip of list titles. The active list is rendered at the right
 * end of the strip so the other (non-active) lists are visible to its left
 * in the user's reading direction. Tap an inactive title to switch; tap the
 * active title to open its action sheet; long-press anywhere does the same.
 *
 * New-list creation is no longer an entry in this strip — that moved to the
 * big green + button rendered next to the wheel in `App.tsx`.
 */
export function ListSwitcher({ lists, activeListId, onSwitch, onLongPress }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Render order: non-active lists in their position order, then the active
  // list last. That way the active title sits at the right edge of the strip
  // and the other lists sit to its left.
  const ordered = useMemo(() => {
    const sorted = [...lists].sort((a, b) => a.position - b.position);
    const active = sorted.find((l) => l.id === activeListId);
    const others = sorted.filter((l) => l.id !== activeListId);
    return active ? [...others, active] : others;
  }, [lists, activeListId]);

  // When the active list changes, scroll the strip so the rightmost item
  // (the active title) is in view. justify-end handles the case where the
  // strip's content fits within the viewport; this handles overflow.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    requestAnimationFrame(() => {
      el.scrollLeft = el.scrollWidth - el.clientWidth;
    });
  }, [activeListId, ordered.length]);

  // Long-press machinery. Pointer events start a 500 ms timer; if the
  // pointer moves more than 8 px before it fires we cancel — treat that as
  // scroll intent so the horizontal strip still works. When the timer fires,
  // we set a flag that the click handler reads to swallow the upcoming tap.
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
      // Tap on the active title opens its action sheet. New-list creation
      // moved to a dedicated big-plus button outside the wheel.
      onLongPress?.(id);
    } else {
      onSwitch(id);
    }
  };

  return (
    <div
      ref={scrollRef}
      className="-mx-4 overflow-x-auto px-4"
      style={{ scrollbarWidth: 'none' }}
    >
      <div className="flex min-w-full items-baseline justify-end gap-5">
        {ordered.map((l) => {
          const active = l.id === activeListId;
          return (
            <div
              key={l.id}
              className="shrink-0 inline-flex items-baseline gap-1.5 py-1"
            >
              {/* Share-state icon is its own button so tapping it opens the
                  action sheet instead of bubbling up to the title button. */}
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
      </div>
    </div>
  );
}

/**
 * Tiny visual cue next to each list title in the strip: greyish when the
 * list is local-only, accent-green when it's been shared via the cloud
 * sync. Sits inline-baseline so it doesn't push the title around.
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
