import { useEffect, useRef } from 'react';
import type { ShopList } from '../types';

interface Props {
  lists: ShopList[];
  activeListId: string;
  onSwitch: (id: string) => void;
  onCreateNew: () => void;
}

/**
 * Horizontal wheel of list titles. Center item is the active list.
 * - Tap an inactive list → switches to it.
 * - Tap the active (centered) title → opens "new list" sheet.
 * - Scroll horizontally → snaps to the next list (which becomes active).
 *
 * Spacers at start and end let the first/last list center properly even though
 * the snap container is wider than the viewport.
 */
export function ListSwitcher({ lists, activeListId, onSwitch, onCreateNew }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
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

  const handleTap = (id: string) => {
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
            <button
              key={l.id}
              ref={(node) => {
                if (node) itemRefs.current.set(l.id, node);
                else itemRefs.current.delete(l.id);
              }}
              type="button"
              onClick={() => handleTap(l.id)}
              className="shrink-0 whitespace-nowrap py-1 transition-all"
              style={{ scrollSnapAlign: 'center', scrollSnapStop: 'always' }}
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
