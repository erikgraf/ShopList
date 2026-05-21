import { useEffect, useRef, useState } from 'react';
import { createList } from '../store';

interface Props {
  onClose: () => void;
}

export function NewListSheet({ onClose }: Props) {
  const [name, setName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    // Autofocus the input on open.
    setTimeout(() => inputRef.current?.focus(), 50);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    await createList(name);
    onClose();
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
        <div className="relative flex items-center justify-between border-b border-[var(--color-surface-2)] px-5 pt-4 pb-3">
          <div className="absolute left-1/2 top-2 h-1 w-10 -translate-x-1/2 rounded-full bg-[var(--color-border-strong)]" />
          <button type="button" onClick={onClose} className="pt-2 text-sm text-[var(--color-muted)]">
            Abbrechen
          </button>
          <h2 className="pt-2 text-base font-semibold text-[var(--color-text-strong)]">
            Neue Liste
          </h2>
          <button
            type="submit"
            form="new-list-form"
            disabled={!name.trim() || busy}
            className="pt-2 text-sm font-semibold text-[var(--color-accent)] disabled:opacity-40"
          >
            Erstellen
          </button>
        </div>

        <form id="new-list-form" onSubmit={submit} className="p-5">
          <input
            ref={inputRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="z. B. Wochenende, REWE, Mama"
            enterKeyHint="done"
            autoCapitalize="sentences"
            lang="de"
            maxLength={40}
            className="w-full rounded-2xl bg-[var(--color-surface-2)] px-4 py-3 text-base text-[var(--color-text)] outline-none"
          />
        </form>
      </div>
    </div>
  );
}
