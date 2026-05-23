import { db, emitChange, onChange } from './db';
import { setActiveListId } from './store';
import type { Item, ShopList } from './types';

/**
 * Shared-list sync client. Tiny by design: one polling loop pulls every
 * shared list from the Pages Function every few seconds, and any local
 * mutation on a shared list schedules a debounced push. The server merges
 * LWW per item by `updatedAt`, so concurrent edits resolve cleanly without
 * us having to do anything smart on the client.
 *
 * Lifecycle:
 *  - `enableSharing(localListId)` — creates a new cloud blob, attaches
 *    `cloud` to the local list row, pushes initial state.
 *  - `joinSharedList(cloudId)` — pulls the blob, creates a local copy with
 *    `cloud` pointing at the same id, sets it active.
 *  - `disableSharing(localListId)` — best-effort DELETE, then strips
 *    `cloud` from the local row (the list stays local, no items lost).
 *  - `startSyncLoop()` — starts the poll-and-push background work. Called
 *    once from `App.tsx` on mount.
 *
 * The "remote applying right now" flag breaks the obvious feedback loop:
 * pulling a snapshot rewrites local Dexie rows, which fires `emitChange`,
 * which would otherwise schedule a push of the just-pulled state straight
 * back. We suppress that push while a pull is being applied.
 */

const API_BASE = '/api/sync';
const POLL_INTERVAL_MS = 5_000;
const PUSH_DEBOUNCE_MS = 600;

interface SyncedList {
  id: string;
  name: string;
  updatedAt: number;
}

interface SyncedItem extends Omit<Item, 'listId'> {}

interface Blob {
  schemaVersion: 1;
  version: number;
  list: SyncedList;
  items: SyncedItem[];
}

function stripListId(items: Item[]): SyncedItem[] {
  return items.map(({ listId: _listId, ...rest }) => rest as SyncedItem);
}

function shareUrl(cloudId: string): string {
  return `${location.origin}/#share=${encodeURIComponent(cloudId)}`;
}

/* ----------------------- public API ----------------------- */

export async function enableSharing(
  localListId: string,
): Promise<{ cloudId: string; url: string }> {
  const list = await db.lists.get(localListId);
  if (!list) throw new Error('Liste nicht gefunden');

  // Idempotent: if the list is already shared, just hand back the existing
  // URL. Tapping "Teilen" again should re-open the share sheet, not mint a
  // brand-new id that orphans the old one.
  if (list.cloud) {
    return { cloudId: list.cloud.id, url: shareUrl(list.cloud.id) };
  }

  const items = await db.items.where('listId').equals(localListId).toArray();

  let res: Response;
  try {
    res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        list: { id: '', name: list.name, updatedAt: list.updatedAt },
        items: stripListId(items),
      }),
    });
  } catch (e) {
    throw new Error(`Netzwerk-Fehler: ${(e as Error)?.message ?? 'unbekannt'}`);
  }
  if (!res.ok) {
    let detail = '';
    try {
      detail = (await res.text()).slice(0, 200);
    } catch {
      // ignore
    }
    throw new Error(`Teilen fehlgeschlagen (HTTP ${res.status}) — ${detail || 'kein Detail'}`);
  }
  const { cloudId, blob } = (await res.json()) as { cloudId: string; blob: Blob };

  await db.lists.update(localListId, {
    cloud: {
      id: cloudId,
      lastPulledVersion: blob.version,
      lastSyncedAt: Date.now(),
    },
  });
  emitChange();
  return { cloudId, url: shareUrl(cloudId) };
}

/**
 * Fetch a remote share for preview without actually adopting it. Used by the
 * #share= join flow so we can show the list name and item count in a
 * confirmation sheet before the user commits.
 */
export async function previewSharedList(
  cloudId: string,
): Promise<{ name: string; itemCount: number; alreadyJoinedLocalId?: string } | null> {
  const blob = await getBlob(cloudId);
  if (!blob) return null;
  const existing = await db.lists.toArray();
  const local = existing.find((l) => l.cloud?.id === cloudId);
  return {
    name: blob.list.name || 'Geteilte Liste',
    itemCount: blob.items.filter((it) => !it.deletedAt).length,
    alreadyJoinedLocalId: local?.id,
  };
}

/**
 * Fetch + JSON-parse with defensive checks. Returns null if the server is
 * unreachable, returns a non-2xx, or sends back something that isn't JSON
 * (typical case: Vite dev's SPA fallback serves the HTML index.html with
 * status 200 for any /api/* path, which would otherwise crash `res.json()`).
 */
async function getBlob(cloudId: string): Promise<Blob | null> {
  try {
    const res = await fetch(`${API_BASE}/${cloudId}`);
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('application/json')) return null;
    return (await res.json()) as Blob;
  } catch {
    return null;
  }
}

export async function disableSharing(localListId: string): Promise<void> {
  const list = await db.lists.get(localListId);
  if (!list?.cloud) return;
  try {
    await fetch(`${API_BASE}/${list.cloud.id}`, { method: 'DELETE' });
  } catch {
    // Network failure — local cleanup still proceeds.
  }
  await db.lists.update(localListId, { cloud: undefined });
  emitChange();
}

/**
 * Pull a shared list by its cloud id and adopt it locally. If the user has
 * already joined this share (matching `cloud.id` on an existing list row),
 * the same local list is reused — opening the magic link twice doesn't
 * create a duplicate. Returns the local list id, or null if the cloud id
 * is unknown to the server.
 */
export async function joinSharedList(cloudId: string): Promise<string | null> {
  const blob = await getBlob(cloudId);
  if (!blob) return null;

  const existing = await db.lists.toArray();
  let local = existing.find((l) => l.cloud?.id === cloudId);
  const now = Date.now();
  if (!local) {
    const minPos = existing.reduce((m, l) => Math.min(m, l.position), 0);
    local = {
      id: uid(),
      name: blob.list.name || 'Geteilte Liste',
      createdAt: now,
      updatedAt: blob.list.updatedAt,
      position: existing.length > 0 ? minPos - 1 : 0,
      cloud: { id: cloudId, lastPulledVersion: blob.version, lastSyncedAt: now },
    };
    await db.lists.put(local);
  } else {
    await db.lists.update(local.id, {
      name: blob.list.name || local.name,
      updatedAt: Math.max(local.updatedAt, blob.list.updatedAt),
      cloud: { id: cloudId, lastPulledVersion: blob.version, lastSyncedAt: now },
    });
  }

  // Replace items: anything we have locally that's not in the remote blob is
  // assumed to be stale (the remote is the source of truth at join time).
  await db.transaction('rw', db.items, async () => {
    const existingItems = await db.items.where('listId').equals(local!.id).toArray();
    const remoteIds = new Set(blob.items.map((r) => r.id));
    for (const it of existingItems) {
      if (!remoteIds.has(it.id)) await db.items.delete(it.id);
    }
    for (const remote of blob.items) {
      if (remote.deletedAt) {
        await db.items.delete(remote.id);
      } else {
        await db.items.put({ ...remote, listId: local!.id } as Item);
      }
    }
  });

  setActiveListId(local.id);
  emitChange();
  return local.id;
}

/* ----------------------- internals ----------------------- */

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Lists currently being patched from a remote pull — skip auto-push for these. */
const applyingRemote = new Set<string>();
/** Per-list debounce timers for pushPending. */
const pushTimers = new Map<string, number>();
/** Per-list in-flight push lock so concurrent emitChange ticks don't stampede. */
const pushing = new Set<string>();

async function applyRemote(localListId: string, blob: Blob): Promise<void> {
  applyingRemote.add(localListId);
  try {
    await db.transaction('rw', db.items, db.lists, async () => {
      const list = await db.lists.get(localListId);
      if (!list?.cloud) return;
      const listPatch: Partial<ShopList> = {
        cloud: { ...list.cloud, lastPulledVersion: blob.version, lastSyncedAt: Date.now() },
      };
      if ((blob.list.updatedAt ?? 0) > (list.updatedAt ?? 0)) {
        listPatch.name = blob.list.name;
        listPatch.updatedAt = blob.list.updatedAt;
      }
      await db.lists.update(localListId, listPatch);

      for (const remote of blob.items) {
        const local = await db.items.get(remote.id);
        if (!local) {
          if (remote.deletedAt) continue;
          await db.items.put({ ...remote, listId: localListId } as Item);
        } else if ((remote.updatedAt ?? 0) > (local.updatedAt ?? 0)) {
          if (remote.deletedAt) await db.items.delete(remote.id);
          else await db.items.put({ ...remote, listId: localListId } as Item);
        }
      }
    });
    emitChange();
  } finally {
    applyingRemote.delete(localListId);
  }
}

async function pushList(localListId: string): Promise<void> {
  if (pushing.has(localListId)) return;
  pushing.add(localListId);
  try {
    const list = await db.lists.get(localListId);
    if (!list?.cloud) return;
    const items = await db.items.where('listId').equals(localListId).toArray();
    const body = {
      list: { id: list.cloud.id, name: list.name, updatedAt: list.updatedAt },
      items: stripListId(items),
    };
    const res = await fetch(`${API_BASE}/${list.cloud.id}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    const merged = (await res.json()) as Blob;
    await applyRemote(localListId, merged);
  } catch {
    // Offline / transient — next tick will try again.
  } finally {
    pushing.delete(localListId);
  }
}

async function pullList(localListId: string): Promise<void> {
  const list = await db.lists.get(localListId);
  if (!list?.cloud) return;
  const blob = await getBlob(list.cloud.id);
  if (!blob) return;
  if (blob.version === list.cloud.lastPulledVersion) return;
  await applyRemote(localListId, blob);
}

function schedulePush(localListId: string): void {
  const existing = pushTimers.get(localListId);
  if (existing) clearTimeout(existing);
  const t = window.setTimeout(() => {
    pushTimers.delete(localListId);
    void pushList(localListId);
  }, PUSH_DEBOUNCE_MS);
  pushTimers.set(localListId, t);
}

let loopHandle: number | undefined;
let unsubscribe: (() => void) | undefined;

export function startSyncLoop(): () => void {
  // Idempotent — calling twice (e.g. React StrictMode mount/remount) is fine.
  if (loopHandle !== undefined || unsubscribe) return stopSyncLoop;

  const tick = async () => {
    try {
      const lists = await db.lists.toArray();
      for (const l of lists) {
        if (l.cloud) await pullList(l.id);
      }
    } finally {
      loopHandle = window.setTimeout(tick, POLL_INTERVAL_MS);
    }
  };
  void tick();

  unsubscribe = onChange(() => {
    void (async () => {
      const lists = await db.lists.toArray();
      for (const l of lists) {
        if (l.cloud && !applyingRemote.has(l.id)) schedulePush(l.id);
      }
    })();
  });

  return stopSyncLoop;
}

export function stopSyncLoop(): void {
  if (loopHandle !== undefined) clearTimeout(loopHandle);
  loopHandle = undefined;
  unsubscribe?.();
  unsubscribe = undefined;
  for (const t of pushTimers.values()) clearTimeout(t);
  pushTimers.clear();
}
