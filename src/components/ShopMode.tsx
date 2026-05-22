import { useEffect, useMemo, useRef, useState } from 'react';
import { startScanner, type BarcodeController } from '../barcode';
import { lookupBarcode } from '../openfoodfacts';
import { lookupBarcodeInSnapshot } from '../snapshot';
import { addItemFromProduct, toggleChecked, useItems } from '../store';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type Category,
  type Item,
  type Product,
  type Store,
} from '../types';
import { ItemRow } from './ItemRow';

/**
 * Continuous-scan "Shop-Modus". The list takes the top of the screen and the
 * camera viewfinder sits in the bottom strip. As the user waves products past
 * the camera, the scanner stays running and:
 *
 *  - Known barcodes (a list item with `item.barcode === code`) toggle that
 *    item's checked state. Silent feedback via a toast.
 *  - Unknown barcodes are looked up (snapshot → Open Food Facts). If a
 *    product comes back, we show a "Hinzufügen?" confirmation chip for a few
 *    seconds — tap to add. Otherwise a brief "Unbekannt" toast.
 *
 * Same barcode within DEBOUNCE_MS is ignored so a single product held in the
 * frame doesn't oscillate between checked/unchecked.
 */
interface Props {
  activeStores: Store[];
  pinToStore?: Store;
  onClose: () => void;
}

const DEBOUNCE_MS = 2500;
const PENDING_MS = 5000;
const TOAST_MS = 1800;

type ToastTone = 'check' | 'uncheck' | 'unknown' | 'added';
interface Toast {
  id: number;
  text: string;
  tone: ToastTone;
}
interface Pending {
  id: number;
  product: Product;
}

let nextId = 1;

export function ShopMode({ activeStores, pinToStore, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const items = useItems();
  const itemsRef = useRef<Item[]>(items);
  itemsRef.current = items;
  const lastCodeRef = useRef<{ code: string; at: number }>({ code: '', at: 0 });
  const [pending, setPending] = useState<Pending | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [error, setError] = useState<string | null>(null);

  const open = useMemo(() => items.filter((it) => !it.checked), [items]);
  const done = useMemo(() => items.filter((it) => it.checked), [items]);
  const grouped = useMemo(() => groupByCategory(open), [open]);

  useEffect(() => {
    let ctl: BarcodeController | null = null;
    let cancelled = false;
    if (!videoRef.current) return;
    void startScanner(
      videoRef.current,
      (code) => {
        if (!cancelled) void onCode(code);
      },
      (err) => {
        if (!cancelled) setError(err.message || 'Kamera konnte nicht gestartet werden.');
      },
      undefined,
      undefined,
      true, // continuous
    ).then((c) => {
      if (cancelled) c.stop();
      else ctl = c;
    });
    return () => {
      cancelled = true;
      ctl?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (text: string, tone: ToastTone) => {
    const id = nextId++;
    setToast({ id, text, tone });
    setTimeout(() => {
      setToast((t) => (t && t.id === id ? null : t));
    }, TOAST_MS);
  };

  const onCode = async (code: string) => {
    const now = Date.now();
    if (lastCodeRef.current.code === code && now - lastCodeRef.current.at < DEBOUNCE_MS) return;
    lastCodeRef.current = { code, at: now };

    // 1) Match against the active list by barcode → toggle.
    const match = itemsRef.current.find((it) => it.barcode === code);
    if (match) {
      const willCheck = !match.checked;
      await toggleChecked(match.id);
      showToast(
        willCheck ? `${match.name} erledigt` : `${match.name} zurück`,
        willCheck ? 'check' : 'uncheck',
      );
      setPending(null);
      return;
    }

    // 2) Unknown — look up the product and offer to add it.
    const product = (await lookupBarcodeInSnapshot(code)) ?? (await lookupBarcode(code));
    if (product) {
      const id = nextId++;
      setPending({ id, product });
      setTimeout(() => {
        setPending((p) => (p && p.id === id ? null : p));
      }, PENDING_MS);
    } else {
      showToast(`Unbekannt: ${code}`, 'unknown');
    }
  };

  const confirmAdd = async () => {
    const cur = pending;
    if (!cur) return;
    setPending(null);
    await addItemFromProduct(cur.product, { pinToStore });
    showToast(`${cur.product.name} hinzugefügt`, 'added');
  };

  const dismissPending = () => setPending(null);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[var(--color-bg)]">
      {/* List portion */}
      <div className="safe-top relative flex-1 overflow-y-auto">
        <div className="mx-auto max-w-md px-4 pt-4 pb-4">
          <div className="mb-4 flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text-strong)]">Shop-Modus</h2>
              <p className="text-xs text-[var(--color-muted)]">
                {open.length} offen{done.length > 0 ? ` · ${done.length} erledigt` : ''} · Barcode
                in den Sucher halten
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Schließen"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface)] text-[var(--color-text)]"
              style={{ boxShadow: 'var(--shadow-sm)' }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M6 6 L18 18" />
                <path d="M18 6 L6 18" />
              </svg>
            </button>
          </div>

          {open.length === 0 && done.length === 0 && (
            <div className="mt-10 rounded-2xl bg-[var(--color-surface)] p-6 text-center">
              <p className="text-sm text-[var(--color-muted)]">
                Liste ist leer. Scanne ein Produkt, um es hinzuzufügen.
              </p>
            </div>
          )}

          {grouped.map(([cat, rows], i) => (
            <section key={cat} className={i === 0 ? '' : 'mt-5'}>
              <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                {CATEGORY_LABELS[cat]}
              </h3>
              <div className="space-y-2">
                {rows.map((it) => (
                  <ItemRow key={it.id} item={it} activeStores={activeStores} />
                ))}
              </div>
            </section>
          ))}

          {done.length > 0 && (
            <section className="mt-6 opacity-80">
              <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                Erledigt
              </h3>
              <div className="space-y-2">
                {done.map((it) => (
                  <ItemRow key={it.id} item={it} activeStores={activeStores} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* Camera viewfinder */}
      <div className="safe-bottom relative h-[38vh] shrink-0 overflow-hidden bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-cover"
          playsInline
          muted
          autoPlay
        />
        {/* Scan zone hint */}
        <div className="pointer-events-none absolute inset-x-8 top-1/2 h-20 -translate-y-1/2 rounded-2xl border-2 border-white/40" />
        <div className="pointer-events-none absolute inset-x-0 bottom-3 text-center text-[11px] font-medium text-white/70">
          Scanner aktiv
        </div>

        {/* Toast */}
        {toast && (
          <div className="pointer-events-none absolute inset-x-0 top-4 flex justify-center">
            <div
              className={`rounded-full px-4 py-2 text-sm font-medium shadow-lg ${
                toast.tone === 'unknown'
                  ? 'bg-red-500 text-white'
                  : toast.tone === 'uncheck'
                  ? 'bg-white/95 text-[var(--color-text)]'
                  : 'bg-[var(--color-success)] text-white'
              }`}
            >
              {toast.text}
            </div>
          </div>
        )}

        {/* Pending "Hinzufügen?" chip */}
        {pending && (
          <div
            className="absolute inset-x-3 top-14 flex items-center gap-3 rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur-sm"
            style={{ boxShadow: 'var(--shadow-lg)' }}
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-[var(--color-text)]">
                {pending.product.name}
              </div>
              {pending.product.brand && (
                <div className="truncate text-xs text-[var(--color-muted)]">
                  {pending.product.brand}
                </div>
              )}
              <div className="mt-0.5 text-[11px] text-[var(--color-muted)]">
                Nicht auf deiner Liste
              </div>
            </div>
            <button
              type="button"
              onClick={dismissPending}
              aria-label="Verwerfen"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[var(--color-muted)]"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <path d="M6 6 L18 18" />
                <path d="M18 6 L6 18" />
              </svg>
            </button>
            <button
              type="button"
              onClick={confirmAdd}
              className="shrink-0 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white"
            >
              Hinzufügen
            </button>
          </div>
        )}

        {/* Camera error */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/90">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function groupByCategory(items: Item[]): Array<[Category, Item[]]> {
  if (items.length === 0) return [];
  const buckets = new Map<Category, Item[]>();
  for (const it of items) {
    const list = buckets.get(it.category);
    if (list) list.push(it);
    else buckets.set(it.category, [it]);
  }
  const out: Array<[Category, Item[]]> = [];
  for (const cat of CATEGORY_ORDER) {
    const list = buckets.get(cat);
    if (list && list.length > 0) out.push([cat, list]);
  }
  return out;
}
