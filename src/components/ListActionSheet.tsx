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

type Mode = 'menu' | 'rename' | 'delete' | 'share-fallback';

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDefault = list.id === DEFAULT_LIST_ID;
  const isShared = !!list.cloud;

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
      const payload = {
        title: list.name,
        text: `Teile „${list.name}" mit mir`,
        url,
      };
      // Web Share API where available — iOS Safari + Chrome Android pop the
      // native share sheet (WhatsApp / iMessage / Mail / AirDrop / …).
      if (typeof navigator.share === 'function') {
        try {
          await navigator.share(payload);
          onClose();
          return;
        } catch (e) {
          // User dismissed the share sheet — that's fine, just close.
          if ((e as Error)?.name === 'AbortError') {
            onClose();
            return;
          }
          // Some browsers throw NotAllowedError when called from a non-user
          // gesture context; fall through to the copy fallback.
        }
      }
      // Fallback: copy to clipboard and show the URL with a "Kopieren"
      // button so the user can paste it themselves.
      try {
        await navigator.clipboard.writeText(url);
      } catch {
        // ignore — we still show the URL in the sheet for manual copy
      }
      setShareUrl(url);
      setMode('share-fallback');
    } catch (e) {
      setError((e as Error)?.message ?? 'Teilen fehlgeschlagen');
    } finally {
      setBusy(false);
    }
  };

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

        {mode === 'share-fallback' && shareUrl && (
          <div className="space-y-3 p-4">
            <p className="text-sm text-[var(--color-text)]">
              Hier ist die Teil-URL. Schicke sie an deinen Partner per WhatsApp,
              Mail oder Kopier-Einfügen.
            </p>
            <div className="rounded-2xl bg-[var(--color-surface-2)] px-4 py-3 text-xs text-[var(--color-text)] break-all">
              {shareUrl}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(shareUrl);
                  } catch {
                    // No-op — URL is visible above for manual selection.
                  }
                }}
                className="flex-1 rounded-full bg-[var(--color-surface-2)] px-4 py-3 text-sm font-medium text-[var(--color-text)]"
              >
                Erneut kopieren
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-full bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white"
              >
                Fertig
              </button>
            </div>
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
