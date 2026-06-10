import { useEffect, useMemo, useRef, useState } from 'react';
import type { ShopList } from '../types';

interface Props {
  lists: ShopList[];
  activeListId: string;
  onSwitch: (id: string) => void;
  /** Tap-and-hold a list title for ~500 ms to open its action sheet
   *  (Umbenennen / Teilen / Löschen). Tapping the active title also fires
   *  this. Optional. */
  onLongPress?: (id: string) => void;
  /** Renders a trailing "+ Neue Liste" entry at the end of the wheel —
   *  list creation lives where the lists live (header redesign "Option A+"
   *  removed the standalone big-plus button). Optional: omit to hide. */
  onNewList?: () => void;
}

const LONG_PRESS_MS = 500;
const LONG_PRESS_MOVE_TOLERANCE = 8;
/** Sentinel itemRefs key for the trailing "+ Neue Liste" wheel entry. */
const NEW_LIST_ID = '__new-list';
/** Items more than (viewport-width / FADE_DIVISOR) away from the centre
 *  collapse to FADE_MIN opacity. Tuned by eye to match the iOS picker
 *  feel — nearest neighbours stay readable, far items fade to a hint. */
const FADE_DIVISOR = 2.2;
const FADE_MIN = 0.22;

/**
 * Horizontal scroll-snap "picker wheel" of list titles. The active title is
 * pinned to the centre of the viewport; non-active titles sit on either side
 * and fade in opacity the further they are from centre, the same way an iOS
 * date/time wheel fades the digits above and below the selected one.
 *
 * Interactions:
 *  - Tap an inactive title → switches to it (snaps to centre).
 *  - Tap the active title → opens its action sheet (Teilen / Umbenennen / …).
 *  - Drag-scroll → snaps to the next list, which becomes the active one.
 *  - Tap the small share icon next to any title → opens that list's action
 *    sheet directly.
 *  - Long-press a title → same action sheet.
 *
 * 50vw spacers at both ends let the first/last list reach the centre even
 * though there's no real content past them.
 */
export function ListSwitcher({ lists, activeListId, onSwitch, onLongPress, onNewList }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const lastReportedRef = useRef<string>(activeListId);
  const programmaticScrollRef = useRef(false);
  const programmaticTimerRef = useRef<number | undefined>(undefined);
  const [opacities, setOpacities] = useState<Record<string, number>>({});

  const ordered = useMemo(
    () => [...lists].sort((a, b) => a.position - b.position),
    [lists],
  );

  // Centre the active title whenever it changes from outside (mount, switch
  // via tap, create new list). Use instant scroll so the scroll-detection
  // handler doesn't fire mid-animation and bounce the active list back.
  useEffect(() => {
    const el = scrollRef.current;
    const node = itemRefs.current.get(activeListId);
    if (!el || !node) return;
    const target = node.offsetLeft + node.offsetWidth / 2 - el.clientWidth / 2;
    programmaticScrollRef.current = true;
    el.scrollTo({ left: target, behavior: 'auto' });
    lastReportedRef.current = activeListId;
    if (programmaticTimerRef.current) window.clearTimeout(programmaticTimerRef.current);
    programmaticTimerRef.current = window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 100);
    // Kick opacities once after scroll so the initial render isn't all-1.
    requestAnimationFrame(() => {
      recalcOpacities();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeListId, ordered.length]);

  const recalcOpacities = () => {
    const el = scrollRef.current;
    if (!el) return;
    const viewportCenter = el.scrollLeft + el.clientWidth / 2;
    const fadeRange = el.clientWidth / FADE_DIVISOR;
    const next: Record<string, number> = {};
    for (const [id, node] of itemRefs.current.entries()) {
      const itemCenter = node.offsetLeft + node.offsetWidth / 2;
      const dist = Math.abs(itemCenter - viewportCenter);
      next[id] = Math.max(FADE_MIN, 1 - dist / fadeRange);
    }
    setOpacities(next);
  };

  // While the user scrolls, (a) update opacities so the items fade smoothly
  // and (b) treat the nearest-to-centre item as the new "active" list once
  // the gesture has settled.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        recalcOpacities();
        if (programmaticScrollRef.current) return;
        const viewportCenter = el.scrollLeft + el.clientWidth / 2;
        let best: { id: string; dist: number } | null = null;
        for (const [id, node] of itemRefs.current.entries()) {
          // The "+ Neue Liste" tail fades like a list but can never become
          // the active one — it's a button, not a list.
          if (id === NEW_LIST_ID) continue;
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
    recalcOpacities();
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSwitch, ordered]);

  // Long-press machinery. Pointer events start a 500 ms timer; if the
  // pointer moves more than 8 px before it fires we cancel — treat that as
  // scroll intent so the horizontal wheel still works. When the timer
  // fires, we set a flag that the click handler reads to swallow the tap.
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
      // Tap on the centre (active) title opens its action sheet. New-list
      // creation lives in the big-plus button outside the wheel.
      onLongPress?.(id);
    } else {
      onSwitch(id);
    }
  };

  return (
    <div className="relative -mx-4">
      <div
        ref={scrollRef}
        className="overflow-x-auto"
        style={{ scrollSnapType: 'x mandatory', scrollbarWidth: 'none' }}
      >
        <div className="flex w-max items-baseline gap-5">
          <div className="shrink-0" style={{ minWidth: '50vw' }} aria-hidden />
          {ordered.map((l) => {
            const active = l.id === activeListId;
            const op = opacities[l.id] ?? 1;
            return (
              <div
                key={l.id}
                ref={(node) => {
                  if (node) itemRefs.current.set(l.id, node);
                  else itemRefs.current.delete(l.id);
                }}
                style={{
                  scrollSnapAlign: 'center',
                  scrollSnapStop: 'always',
                  opacity: op,
                }}
                className="shrink-0 inline-flex items-baseline gap-1.5 py-1 transition-opacity duration-150"
              >
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
          {onNewList && (
            <div
              ref={(node) => {
                if (node) itemRefs.current.set(NEW_LIST_ID, node);
                else itemRefs.current.delete(NEW_LIST_ID);
              }}
              style={{
                scrollSnapAlign: 'center',
                opacity: opacities[NEW_LIST_ID] ?? 1,
              }}
              className="shrink-0 inline-flex items-baseline py-1 transition-opacity duration-150"
            >
              <button
                type="button"
                onClick={onNewList}
                aria-label="Neue Liste"
                className="inline-flex items-center gap-1 whitespace-nowrap text-base font-medium text-[var(--color-accent)] active:opacity-60 transition-press"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  aria-hidden
                >
                  <path d="M12 5v14" />
                  <path d="M5 12h14" />
                </svg>
                <span>Neue Liste</span>
              </button>
            </div>
          )}
          <div className="shrink-0" style={{ minWidth: '50vw' }} aria-hidden />
        </div>
      </div>
    </div>
  );
}

/**
 * Tiny visual cue next to each list title in the wheel: greyish when the
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
