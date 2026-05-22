/**
 * Shared types and merge logic for the shared-list sync endpoints. Files
 * starting with `_` aren't exposed as Pages routes, so this module is safe
 * to import from sibling handlers without accidentally serving it.
 */

export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface Env {
  SHARED_LISTS: KVNamespace;
}

export interface PagesFunctionContext {
  request: Request;
  env: Env;
  params: Record<string, string | string[] | undefined>;
}

export type Handler = (ctx: PagesFunctionContext) => Promise<Response> | Response;

export interface SyncedItem {
  id: string;
  productId?: string;
  name: string;
  brand?: string;
  brandByStore?: Record<string, string>;
  image?: string;
  category?: string;
  barcode?: string;
  stores?: string[];
  quantity?: number;
  unit?: string;
  checked?: boolean;
  addedAt?: number;
  updatedAt: number;
  deletedAt?: number;
  position?: number;
  icon?: string;
  sizes?: number[];
}

export interface SyncedList {
  id: string;
  name: string;
  updatedAt: number;
}

export interface Blob {
  schemaVersion: 1;
  version: number;
  list: SyncedList;
  items: SyncedItem[];
  prunedAt?: number;
}

const TOMBSTONE_TTL_MS = 30 * 24 * 3600 * 1000;

export const CORS: HeadersInit = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

export function plain(text: string, status: number): Response {
  return new Response(text, { status, headers: CORS });
}

/** 256 random bits → URL-safe base64, no padding. */
export function newCloudId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let b64 = '';
  for (const b of bytes) b64 += String.fromCharCode(b);
  return btoa(b64).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Merge an incoming snapshot into the stored blob via LWW per item by
 * `updatedAt`. Tombstones (items with `deletedAt`) older than 30 days are
 * dropped so blobs don't grow unbounded.
 */
export function merge(stored: Blob | null, incoming: Partial<Blob>, cloudId: string): Blob {
  const now = Date.now();
  const seedList: SyncedList = {
    id: cloudId,
    name: incoming.list?.name ?? stored?.list.name ?? '',
    updatedAt: incoming.list?.updatedAt ?? stored?.list.updatedAt ?? now,
  };

  if (!stored) {
    const items = (incoming.items ?? []).filter(
      (it) => !it.deletedAt || now - it.deletedAt < TOMBSTONE_TTL_MS,
    );
    return { schemaVersion: 1, version: 1, list: seedList, items, prunedAt: now };
  }

  const byId = new Map<string, SyncedItem>();
  for (const it of stored.items) byId.set(it.id, it);
  for (const it of incoming.items ?? []) {
    const cur = byId.get(it.id);
    if (!cur || (it.updatedAt ?? 0) > (cur.updatedAt ?? 0)) {
      byId.set(it.id, it);
    }
  }

  const items: SyncedItem[] = [];
  for (const it of byId.values()) {
    if (it.deletedAt && now - it.deletedAt > TOMBSTONE_TTL_MS) continue;
    items.push(it);
  }

  const list: SyncedList =
    incoming.list && (incoming.list.updatedAt ?? 0) > (stored.list.updatedAt ?? 0)
      ? { ...incoming.list, id: cloudId }
      : { ...stored.list, id: cloudId };

  return {
    schemaVersion: 1,
    version: stored.version + 1,
    list,
    items,
    prunedAt: now,
  };
}

export async function readBody(request: Request): Promise<Partial<Blob>> {
  if (!request.headers.get('content-type')?.includes('application/json')) return {};
  try {
    return (await request.json()) as Partial<Blob>;
  } catch {
    return {};
  }
}
