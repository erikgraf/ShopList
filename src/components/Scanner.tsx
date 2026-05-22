import { useEffect, useRef, useState } from 'react';
import { listCameras, startScanner, type BarcodeController, type CameraDevice } from '../barcode';
import { lookupBarcode } from '../openfoodfacts';
import { lookupBarcodeInSnapshot } from '../snapshot';
import { addItemFromProduct } from '../store';
import type { Store } from '../types';

type Status = 'starting' | 'scanning' | 'looking-up' | 'unknown' | 'error';

const STORED_CAM_KEY = 'shoplist.cameraId';

export function Scanner({
  onClose,
  pinToStore,
}: {
  onClose: () => void;
  pinToStore?: Store;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<Status>('starting');
  const [error, setError] = useState<string>('');
  const [lastCode, setLastCode] = useState<string>('');
  const [manualCode, setManualCode] = useState<string>('');
  const [showManual, setShowManual] = useState(false);
  const [framesTried, setFramesTried] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | undefined>(
    () => localStorage.getItem(STORED_CAM_KEY) ?? undefined,
  );
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (status !== 'scanning') return;
    const start = Date.now();
    const t = setInterval(() => setElapsed(Math.round((Date.now() - start) / 1000)), 250);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    if (status === 'scanning' && elapsed >= 8 && !showManual) setShowManual(true);
  }, [status, elapsed, showManual]);

  useEffect(() => {
    let ctl: BarcodeController | null = null;
    let cancelled = false;
    if (!videoRef.current) return;

    setStatus('scanning');
    setElapsed(0);
    setFramesTried(0);

    startScanner(
      videoRef.current,
      (code) => {
        if (cancelled) return;
        void resolveCode(code);
      },
      (err) => {
        if (cancelled) return;
        setError(err.message || 'Kamera konnte nicht gestartet werden.');
        setStatus('error');
      },
      () => {
        if (cancelled) return;
        setFramesTried((n) => n + 1);
      },
      activeCameraId,
    ).then((c) => {
      if (cancelled) c.stop();
      else ctl = c;
    });

    // Refresh the camera list whenever the scanner is (re)started — labels are
    // populated only after at least one successful getUserMedia call.
    void listCameras().then((cs) => {
      if (!cancelled) setCameras(cs);
    });

    return () => {
      cancelled = true;
      ctl?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCameraId]);

  const resolveCode = async (code: string) => {
    setLastCode(code);
    setStatus('looking-up');
    const product = (await lookupBarcodeInSnapshot(code)) ?? (await lookupBarcode(code));
    if (product) {
      await addItemFromProduct(product, { pinToStore });
      onClose();
    } else {
      setStatus('unknown');
    }
  };

  const addUnknown = async () => {
    if (!lastCode) return;
    await addItemFromProduct(
      {
        id: lastCode,
        name: `Artikel ${lastCode}`,
        category: 'sonstiges',
        barcode: lastCode,
      },
      { pinToStore },
    );
    onClose();
  };

  const submitManual = (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    void resolveCode(code);
  };

  const pickCamera = (id: string) => {
    localStorage.setItem(STORED_CAM_KEY, id);
    setActiveCameraId(id);
    setPickerOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black text-white">
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="h-full w-full object-cover"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="relative h-44 w-72 rounded-2xl border-2 border-[var(--color-accent)] shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
            {status === 'scanning' && (
              <div className="absolute left-2 right-2 top-1/2 h-px -translate-y-1/2 animate-pulse bg-[var(--color-accent)]/80" />
            )}
          </div>
        </div>
        <div className="safe-top absolute left-0 right-0 top-0 flex items-center justify-between p-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-black/60 px-4 py-2 text-sm backdrop-blur"
          >
            Abbrechen
          </button>
          <div className="flex items-center gap-2">
            {status === 'scanning' && (
              <div className="rounded-full bg-black/60 px-3 py-1.5 text-xs tabular-nums backdrop-blur">
                {elapsed}s · {framesTried}
              </div>
            )}
            {cameras.length > 1 && (
              <button
                type="button"
                onClick={() => setPickerOpen((v) => !v)}
                aria-label="Kamera wechseln"
                className="rounded-full bg-black/60 p-2 backdrop-blur"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 10l4 4M14 14l4-4" />
                  <rect x="2" y="6" width="20" height="14" rx="2" />
                  <path d="M8 6l2-3h4l2 3" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {pickerOpen && cameras.length > 1 && (
          <div className="safe-top absolute right-4 top-16 z-10 max-w-[80vw] overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] shadow-2xl">
            {cameras.map((cam) => (
              <button
                key={cam.deviceId || cam.label}
                type="button"
                onClick={() => pickCamera(cam.deviceId)}
                className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm active:bg-[var(--color-surface-2)] ${
                  activeCameraId === cam.deviceId ? 'text-[var(--color-accent)]' : ''
                }`}
              >
                <span className="truncate">{cam.label}</span>
                {activeCameraId === cam.deviceId && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="m5 12 5 5L20 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="safe-bottom space-y-3 bg-[var(--color-bg)] p-4">
        {status === 'starting' && (
          <p className="text-center text-sm text-[var(--color-muted)]">Kamera startet…</p>
        )}

        {status === 'scanning' && (
          <>
            <p className="text-center text-sm text-[var(--color-muted)]">
              Barcode mittig in den Rahmen halten. Bei Laptop-Kameras hilft mehr Licht und ein Abstand
              von 25–40&nbsp;cm.
            </p>
            {showManual && (
              <form onSubmit={submitManual} className="space-y-2">
                <p className="text-center text-xs text-[var(--color-muted)]">
                  Klappt nicht? Code manuell eingeben:
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoFocus
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    placeholder="13-stelliger Barcode"
                    className="flex-1 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-base text-[var(--color-text)] outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!manualCode.trim()}
                    className="rounded-2xl bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-bg)] disabled:opacity-50"
                  >
                    Suchen
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {status === 'looking-up' && (
          <p className="text-center text-sm text-[var(--color-muted)]">
            Code <span className="font-mono">{lastCode}</span> wird nachgeschlagen…
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
              Auf iOS funktioniert der Kamera-Zugriff nur über HTTPS oder localhost.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
