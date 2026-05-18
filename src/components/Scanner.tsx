import { useEffect, useRef, useState } from 'react';
import { startScanner, type BarcodeController } from '../barcode';
import { lookupBarcode } from '../openfoodfacts';
import { lookupBarcodeInSnapshot } from '../snapshot';
import { addItemFromProduct } from '../store';

export function Scanner({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'starting' | 'scanning' | 'found' | 'unknown' | 'error'>(
    'starting',
  );
  const [error, setError] = useState<string>('');
  const [lastCode, setLastCode] = useState<string>('');

  useEffect(() => {
    let ctl: BarcodeController | null = null;
    let cancelled = false;
    if (!videoRef.current) return;

    setStatus('scanning');
    startScanner(
      videoRef.current,
      async (code) => {
        if (cancelled) return;
        setLastCode(code);
        setStatus('found');
        const product = (await lookupBarcodeInSnapshot(code)) ?? (await lookupBarcode(code));
        if (cancelled) return;
        if (product) {
          await addItemFromProduct(product);
          onClose();
        } else {
          setStatus('unknown');
        }
      },
      (err) => {
        setError(err.message || 'Kamera konnte nicht gestartet werden.');
        setStatus('error');
      },
    ).then((c) => {
      if (cancelled) c.stop();
      else ctl = c;
    });

    return () => {
      cancelled = true;
      ctl?.stop();
    };
  }, [onClose]);

  const addUnknown = async () => {
    if (!lastCode) return;
    await addItemFromProduct({
      id: lastCode,
      name: `Artikel ${lastCode}`,
      category: 'sonstiges',
      barcode: lastCode,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-44 w-72 rounded-2xl border-2 border-[var(--color-accent)] shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]" />
        </div>
        <div className="absolute left-0 right-0 top-0 safe-top p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-black/60 px-4 py-2 text-sm backdrop-blur"
          >
            Abbrechen
          </button>
        </div>
      </div>
      <div className="safe-bottom space-y-3 bg-[var(--color-bg)] p-4">
        {status === 'scanning' && (
          <p className="text-center text-sm text-[var(--color-muted)]">
            Barcode in den Rahmen halten…
          </p>
        )}
        {status === 'found' && (
          <p className="text-center text-sm text-[var(--color-muted)]">
            Code {lastCode} — wird nachgeschlagen…
          </p>
        )}
        {status === 'unknown' && (
          <div className="space-y-3 text-center">
            <p className="text-sm">
              Code <span className="font-mono">{lastCode}</span> nicht gefunden.
            </p>
            <button
              type="button"
              onClick={addUnknown}
              className="w-full rounded-2xl bg-[var(--color-accent)] py-3 text-base font-semibold text-[var(--color-bg)]"
            >
              Trotzdem hinzufügen
            </button>
          </div>
        )}
        {status === 'error' && (
          <div className="space-y-3 text-center">
            <p className="text-sm text-[var(--color-danger)]">{error}</p>
            <p className="text-xs text-[var(--color-muted)]">
              Kamera-Zugriff in den Browser-Einstellungen erlauben. Auf iOS funktioniert dies nur über HTTPS oder localhost.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
