import { useEffect, useState } from 'react';
import { setActiveListId } from '../store';
import { joinSharedList, previewSharedList } from '../sync';

/**
 * Shown when the app opens with a `#share=<cloudId>` fragment in the URL.
 * Fetches a preview of the remote list (name + item count) and lets the user
 * confirm before importing — opening a magic link should never silently
 * mutate the user's set of lists.
 *
 * If the cloud id is already in our local store (the user joined this share
 * earlier), we just switch to it and dismiss without prompting.
 */
interface Props {
  cloudId: string;
  onClose: () => void;
}

type State =
  | { kind: 'loading' }
  | { kind: 'unknown' }
  | { kind: 'ready'; name: string; itemCount: number }
  | { kind: 'joining' };

export function JoinShareSheet({ cloudId, onClose }: Props) {
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const preview = await previewSharedList(cloudId);
      if (cancelled) return;
      if (!preview) {
        setState({ kind: 'unknown' });
        return;
      }
      if (preview.alreadyJoinedLocalId) {
        // Auto-switch without confirmation — opening the link again is a
        // no-op signal "show me this list", not "import again".
        setActiveListId(preview.alreadyJoinedLocalId);
        onClose();
        return;
      }
      setState({ kind: 'ready', name: preview.name, itemCount: preview.itemCount });
    })();
    return () => {
      cancelled = true;
    };
  }, [cloudId, onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const join = async () => {
    setState({ kind: 'joining' });
    const localId = await joinSharedList(cloudId);
    if (localId) {
      onClose();
    } else {
      setState({ kind: 'unknown' });
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
            Geteilte Liste
          </h2>
        </div>

        {state.kind === 'loading' && (
          <p className="px-5 pb-6 text-sm text-[var(--color-muted)]">Lade Liste…</p>
        )}

        {state.kind === 'unknown' && (
          <div className="space-y-3 px-5 pb-6">
            <p className="text-sm text-[var(--color-text)]">
              Diese geteilte Liste gibt es nicht (mehr). Vielleicht wurde sie gelöscht
              oder die URL ist falsch.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-full bg-[var(--color-surface-2)] px-4 py-3 text-sm font-medium text-[var(--color-text)]"
            >
              Schließen
            </button>
          </div>
        )}

        {(state.kind === 'ready' || state.kind === 'joining') && (
          <div className="space-y-4 px-5 pb-6">
            <div className="rounded-2xl bg-[var(--color-surface-2)] px-4 py-3">
              <div className="text-sm font-semibold text-[var(--color-text)]">
                {state.kind === 'ready' ? state.name : 'Wird hinzugefügt…'}
              </div>
              {state.kind === 'ready' && (
                <div className="text-xs text-[var(--color-muted)]">
                  {state.itemCount === 0
                    ? 'Noch keine Einträge'
                    : `${state.itemCount} ${state.itemCount === 1 ? 'Eintrag' : 'Einträge'}`}
                </div>
              )}
            </div>
            <p className="text-xs text-[var(--color-muted)]">
              Wenn du beitrittst, wird diese Liste live mit deinem Partner synchronisiert.
              Änderungen — Häkchen, Mengen, neue Einträge — laufen in beide Richtungen.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={state.kind === 'joining'}
                className="flex-1 rounded-full bg-[var(--color-surface-2)] px-4 py-3 text-sm font-medium text-[var(--color-text)] disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={join}
                disabled={state.kind === 'joining'}
                className="flex-1 rounded-full bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                Liste beitreten
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
