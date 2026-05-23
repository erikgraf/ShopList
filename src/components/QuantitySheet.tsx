import { useEffect, useRef, useState } from 'react';
import { setQuantity } from '../store';
import type { Item } from '../types';

/**
 * Bottom sheet for editing an item's quantity. Three controls:
 *  - Preset chips (only when the item declares `sizes`): tap any chip to
 *    pick that exact quantity and dismiss the sheet — one tap covers
 *    "Sixpack", "Kasten" etc.
 *  - Big stepper: −/+ around a hero number. Most everyday quantities are
 *    1–12 so two or three taps gets there. Holding the button accelerates.
 *  - Fertig commits the local stepper value; chips commit immediately.
 *
 * Replaces the earlier iOS-style scroll-snap wheel — that was accurate but
 * visually loud and slow to land on a number for a sub-second interaction.
 */
interface Props {
  item: Item;
  onClose: () => void;
}

const MIN = 1;
const MAX = 999;
const HOLD_STEP_INITIAL_DELAY_MS = 350;
const HOLD_STEP_INTERVAL_MS = 80;

export function QuantitySheet({ item, onClose }: Props) {
  const [value, setValue] = useState(item.quantity);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter') void confirm();
      if (e.key === 'ArrowUp') setValue((v) => Math.min(MAX, v + 1));
      if (e.key === 'ArrowDown') setValue((v) => Math.max(MIN, v - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

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
    if (n === 12) return 'Zwölfer';
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
        <div className="relative flex items-center justify-between px-5 pt-4 pb-3">
          <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-[var(--color-border-strong)]" />
          <button
            type="button"
            onClick={onClose}
            className="pt-2 text-sm text-[var(--color-muted)]"
          >
            Abbrechen
          </button>
          <h2 className="pt-2 text-base font-semibold text-[var(--color-text-strong)]">Menge</h2>
          <button
            type="button"
            onClick={confirm}
            className="pt-2 text-sm font-semibold text-[var(--color-accent)]"
          >
            Fertig
          </button>
        </div>

        {item.sizes && item.sizes.length > 0 && (
          <div className="px-5 pt-4 pb-2">
            <div className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
              Gängige Größen
            </div>
            <div className="flex flex-wrap gap-2">
              {item.sizes.map((n) => {
                const label = sizeLabel(n);
                const isActive = value === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => quickPick(n)}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium transition-press ${
                      isActive
                        ? 'bg-[var(--color-accent)] text-white'
                        : 'bg-[var(--color-surface-2)] text-[var(--color-text)] active:bg-[var(--color-border)]'
                    }`}
                  >
                    <span className="tabular-nums">×{n}</span>
                    {label && (
                      <span
                        className={`text-[11px] ${
                          isActive ? 'text-white/80' : 'text-[var(--color-muted)]'
                        }`}
                      >
                        · {label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex items-center justify-center gap-6 px-5 pt-6 pb-8">
          <StepperButton
            ariaLabel="Eins weniger"
            disabled={value <= MIN}
            onPress={() => setValue((v) => Math.max(MIN, v - 1))}
          >
            <MinusIcon />
          </StepperButton>
          <div className="min-w-[7rem] flex flex-col items-center">
            <div className="text-[56px] font-semibold tabular-nums leading-none text-[var(--color-text-strong)]">
              ×{value}
            </div>
            <div className="mt-1 h-5 text-sm text-[var(--color-muted)]">
              {sizeLabel(value) ?? ''}
            </div>
          </div>
          <StepperButton
            ariaLabel="Eins mehr"
            disabled={value >= MAX}
            onPress={() => setValue((v) => Math.min(MAX, v + 1))}
          >
            <PlusIcon />
          </StepperButton>
        </div>
      </div>
    </div>
  );
}

/**
 * Circular ±-button with press-and-hold acceleration. After an initial
 * delay it fires `onPress` at a regular interval so the user can ramp up
 * to high values (24, 50, …) without 24 individual taps.
 */
function StepperButton({
  onPress,
  disabled,
  ariaLabel,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  const holdTimer = useRef<number | undefined>(undefined);
  const repeatTimer = useRef<number | undefined>(undefined);

  const clearTimers = () => {
    if (holdTimer.current !== undefined) window.clearTimeout(holdTimer.current);
    if (repeatTimer.current !== undefined) window.clearInterval(repeatTimer.current);
    holdTimer.current = undefined;
    repeatTimer.current = undefined;
  };

  const start = () => {
    if (disabled) return;
    onPress();
    holdTimer.current = window.setTimeout(() => {
      repeatTimer.current = window.setInterval(onPress, HOLD_STEP_INTERVAL_MS);
    }, HOLD_STEP_INITIAL_DELAY_MS);
  };

  useEffect(() => () => clearTimers(), []);

  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onPointerDown={(e) => {
        e.preventDefault();
        start();
      }}
      onPointerUp={clearTimers}
      onPointerLeave={clearTimers}
      onPointerCancel={clearTimers}
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)] transition-press active:bg-[var(--color-accent)] active:text-white disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function MinusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M5 12h14" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
