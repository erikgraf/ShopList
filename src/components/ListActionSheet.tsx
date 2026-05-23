import { useEffect, useState } from 'react';
import { DEFAULT_LIST_ID, type ShopList } from '../types';
import { deleteList, renameList } from '../store';
import { enableSharing } from '../sync';

/**
 * Per-list action sheet shown after a long-press on a title in the
 * ListSwitcher. Three actions:
 *  - Umbenennen — inline rename input, saves via `renameList`.
 *  - Teilen — calls `enableSharing` (idempotent — re-tap just re-opens the
 *    share sheet), then `navigator.share()` so the user can pick WhatsApp,
 *    iMessage, AirDrop, Mail, etc. Falls back to copying the URL to the
 *    clipboard on browsers without Web Share API (most desktops).
 *  - Löschen — confirm step inside the sheet, then `deleteList` (which
 *    revokes the cloud share if any). Disabled for the default list.
 */
interface Props {
  list: ShopList;
  onClose: () => void;
}

type Mode = 'menu' | 'rename' | 'delete' | 'share';

const SYNC_LABEL_FORMATTER = new Intl.RelativeTimeFormat('de', { numeric: 'auto' });

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const seconds = Math.round(diff / 1000);
  if (seconds < 60) return SYNC_LABEL_FORMATTER.format(-seconds, 'second');
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return SYNC_LABEL_FORMATTER.format(-minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (hours < 24) return SYNC_LABEL_FORMATTER.format(-hours, 'hour');
  const days = Math.round(hours / 24);
  return SYNC_LABEL_FORMATTER.format(-days, 'day');
}

export function ListActionSheet({ list, onClose }: Props) {
  const [mode, setMode] = useState<Mode>('menu');
  const [name, setName] = useState(list.name);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copyHint, setCopyHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDefault = list.id === DEFAULT_LIST_ID;
  const isShared = !!list.cloud;
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const runShare = async () => {
    setBusy(true);
    setError(null);
    try {
      const { url } = await enableSharing(list.id);
      setShareUrl(url);
      // Lazy-load qrcode so the ~12 KB gzip payload only downloads when
      // the user actually opens the share flow.
      const { default: QRCode } = await import('qrcode');
      const dataUrl = await QRCode.toDataURL(url, {
        width: 320,
        margin: 1,
        errorCorrectionLevel: 'M',
        color: { dark: '#1f2937', light: '#ffffff' },
      });
      setQrDataUrl(dataUrl);
      setMode('share');
    } catch (e) {
      setError((e as Error)?.message ?? 'Teilen fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

  const runNativeShare = async () => {
    if (!shareUrl) return;
    try {
      await navigator.share({
        title: list.name,
        text: `Teile „${list.name}" mit mir`,
        url: shareUrl,
      });
      onClose();
    } catch (e) {
      // AbortError = user dismissed the OS sheet — leave our sheet open
      // so they can try a different method. Other errors: same behaviour.
      if ((e as Error)?.name !== 'AbortError') {
        // No-op; could surface but the UI still shows QR + copy options.
      }
    }
  };

  const runCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopyHint(true);
      setTimeout(() => setCopyHint(false), 1500);
    } catch {
      // No-op — URL is visible in the sheet for manual select-and-copy.
    }
  };

  /**
   * WhatsApp deep-link via wa.me — works on phones (opens the app with the
   * message pre-filled) AND on desktops (opens WhatsApp Web). Built as a
   * real anchor href in the JSX rather than `window.open`, because Safari
   * and installed iOS PWAs silently block `window.open` calls that aren't
   * inside a tightly-coupled click handler.
   */
  const whatsappHref =
    shareUrl
      ? `https://wa.me/?text=${encodeURIComponent(`Teile „${list.name}" mit mir: ${shareUrl}`)}`
      : null;

  const runRename = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === list.name) {
      onClose();
      return;
    }
    setBusy(true);
    try {
      await renameList(list.id, trimmed);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const runDelete = async () => {
    setBusy(true);
    try {
      await deleteList(list.id);
      onClose();
    } finally {
      setBusy(false);
    }
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
        className="safe-bottom max-h-[75vh] overflow-y-auto rounded-t-3xl bg-[var(--color-surface)]"
        style={{ boxShadow: 'var(--shadow-lg)' }}
      >
        <div className="relative px-5 pt-5 pb-3">
          <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-[var(--color-border-strong)]" />
          <h2 className="pt-1 text-base font-semibold text-[var(--color-text-strong)]">
            {list.name}
          </h2>
          {isShared && list.cloud && (
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">
              Geteilt · zuletzt synchronisiert {relativeTime(list.cloud.lastSyncedAt)}
            </p>
          )}
        </div>

        {mode === 'menu' && (
          <div className="space-y-1.5 p-4">
            <ActionRow
              icon={<PencilIcon />}
              label="Umbenennen"
              onClick={() => setMode('rename')}
            />
            <ActionRow
              icon={<ShareIcon />}
              label={isShared ? 'Erneut teilen' : 'Teilen'}
              hint={isShared ? 'Bestehende URL — gleicher Link wie zuvor.' : undefined}
              onClick={runShare}
              busy={busy}
              tone="accent"
            />
            <ActionRow
              icon={<TrashIcon />}
              label="Löschen"
              hint={isDefault ? 'Die Standardliste kann nicht gelöscht werden.' : undefined}
              onClick={() => setMode('delete')}
              disabled={isDefault}
              tone="danger"
            />
            {error && (
              <p className="px-2 pt-2 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}
          </div>
        )}

        {mode === 'rename' && (
          <div className="space-y-3 p-4">
            <label className="block">
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-muted)]">
                Neuer Name
              </span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void runRename();
                }}
                className="w-full rounded-2xl bg-[var(--color-surface-2)] px-4 py-3 text-base text-[var(--color-text)] outline-none focus:bg-[var(--color-bg)]"
                style={{ boxShadow: 'var(--shadow-ring-accent)' }}
                lang="de"
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('menu')}
                className="flex-1 rounded-full bg-[var(--color-surface-2)] px-4 py-3 text-sm font-medium text-[var(--color-text)]"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={runRename}
                disabled={busy}
                className="flex-1 rounded-full bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Speichern
              </button>
            </div>
          </div>
        )}

        {mode === 'delete' && (
          <div className="space-y-3 p-4">
            <p className="text-sm text-[var(--color-text)]">
              „{list.name}" wird gelöscht — inklusive aller {' '}
              <span className="font-semibold">Einträge</span>
              {isShared && (
                <>
                  {' '}
                  und der <span className="font-semibold">Freigabe</span> mit anderen
                </>
              )}
              . Das lässt sich nicht rückgängig machen.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode('menu')}
                className="flex-1 rounded-full bg-[var(--color-surface-2)] px-4 py-3 text-sm font-medium text-[var(--color-text)]"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={runDelete}
                disabled={busy}
                className="flex-1 rounded-full bg-red-500 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Löschen
              </button>
            </div>
          </div>
        )}

        {mode === 'share' && shareUrl && qrDataUrl && (
          <div className="space-y-4 p-4">
            <p className="text-center text-sm text-[var(--color-text)]">
              Lass deinen Partner den Code scannen — oder schicke die URL
              direkt per Nachricht.
            </p>
            <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-2xl bg-white p-3 shadow-sm">
              <img src={qrDataUrl} alt="QR-Code" className="h-full w-full" />
            </div>
            <div
              className="rounded-2xl bg-[var(--color-surface-2)] px-4 py-2.5 text-center text-[11px] text-[var(--color-muted-strong)] break-all"
              aria-label="Teil-URL"
            >
              {shareUrl}
            </div>
            <div className={canNativeShare ? 'grid grid-cols-2 gap-2' : 'space-y-2'}>
              {whatsappHref && (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white active:opacity-90 transition-press"
                >
                  <WhatsAppIcon />
                  Per WhatsApp
                </a>
              )}
              {canNativeShare && (
                <button
                  type="button"
                  onClick={runNativeShare}
                  className="rounded-full bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white active:opacity-90 transition-press"
                >
                  Andere App
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={runCopy}
              className="w-full pt-1 text-xs text-[var(--color-muted)] active:text-[var(--color-text)]"
            >
              {copyHint ? '✓ URL kopiert' : 'URL kopieren'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full pt-1 text-sm text-[var(--color-muted)] active:text-[var(--color-text)]"
            >
              Fertig
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ActionRow({
  icon,
  label,
  hint,
  onClick,
  disabled,
  busy,
  tone = 'default',
}: {
  icon: React.ReactNode;
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
  busy?: boolean;
  tone?: 'default' | 'accent' | 'danger';
}) {
  const toneClass =
    tone === 'accent'
      ? 'text-[var(--color-accent)]'
      : tone === 'danger'
      ? 'text-red-600'
      : 'text-[var(--color-text)]';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-press disabled:opacity-50 ${
        disabled ? '' : 'active:bg-[var(--color-surface-2)]'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-2)] ${toneClass}`}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-semibold ${toneClass}`}>{label}</span>
        {hint && <span className="block text-xs text-[var(--color-muted)]">{hint}</span>}
      </span>
    </button>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m14.5 4.5 5 5L8 21H3v-5z" />
      <path d="m12 7 5 5" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3v13" />
      <path d="m8 7 4-4 4 4" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="m6 7 1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
    </svg>
  );
}
