/**
 * Cloudflare Pages Function — shared-list sync endpoint.
 *
 *  POST   /api/sync              create a new shared list, return { cloudId, blob }
 *  GET    /api/sync/:cloudId     fetch the current blob (404 if unknown)
 *  POST   /api/sync/:cloudId     merge a client snapshot in (LWW per item by
 *                                updatedAt), return the new server state
 *  DELETE /api/sync/:cloudId     revoke share
 *
 * Auth model is "possession of cloudId == access". `cloudId` is 256 random
 * bits (URL-safe base64, ~43 chars). For a shopping list that's plenty —
 * the worst-case leak reveals that someone needs milk.
 *
 * Stored in KV under `list:<cloudId>` as a single JSON blob. Items merge per
 * id by their `updatedAt`; deletes propagate via `deletedAt` tombstones,
 * pruned 30 days after the delete so slow-syncing devices still see them.
 */

// Inline workers types (avoid a devDependency on @cloudflare/workers-types).
interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

interface Env {
  SHARED_LISTS: KVNamespace;
}

interface PagesFunctionContext {
  request: Request;
  env: Env;
  params: { path?: string | string[] };
}

type Handler = (ctx: PagesFunctionContext) => Promise<Response> | Response;

interface SyncedItem {
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

interface SyncedList {
  id: string;
  name: string;
  updatedAt: number;
}

interface Blob {
  schemaVersion: 1;
  version: number;
  list: SyncedList;
  items: SyncedItem[];
  prunedAt?: number;
}

const TOMBSTONE_TTL_MS = 30 * 24 * 3600 * 1000;

const CORS: HeadersInit = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, DELETE, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'content-type': 'application/json' },
  });
}

function plain(text: string, status: number): Response {
  return new Response(text, { status, headers: CORS });
}

/** 256 random bits → URL-safe base64, no padding. */
function newCloudId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let b64 = '';
  for (const b of bytes) b64 += String.fromCharCode(b);
  return btoa(b64).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pathFromParams(params: PagesFunctionContext['params']): string[] {
  const raw = params.path;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

/**
 * LWW merge of incoming snapshot into stored. Each item is keyed by id;
 * incoming wins iff its `updatedAt` is strictly newer. Tombstones older than
 * TOMBSTONE_TTL_MS are dropped so the blob doesn't grow unbounded.
 */
function merge(stored: Blob | null, incoming: Partial<Blob>, cloudId: string): Blob {
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

export const onRequestOptions: Handler = () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestGet: Handler = async ({ env, params }) => {
  const segs = pathFromParams(params);
  if (segs.length === 0) return plain('cloudId required', 400);
  const id = segs[0];
  const raw = await env.SHARED_LISTS.get(`list:${id}`);
  if (!raw) return plain('not found', 404);
  return new Response(raw, {
    headers: { ...CORS, 'content-type': 'application/json' },
  });
};

export const onRequestPost: Handler = async ({ env, request, params }) => {
  const segs = pathFromParams(params);
  let incoming: Partial<Blob> = {};
  try {
    if (request.headers.get('content-type')?.includes('application/json')) {
      incoming = (await request.json()) as Partial<Blob>;
    }
  } catch {
    return plain('invalid JSON body', 400);
  }

  // POST /api/sync → create a brand-new shared list.
  if (segs.length === 0) {
    const cloudId = newCloudId();
    const blob = merge(null, incoming, cloudId);
    await env.SHARED_LISTS.put(`list:${cloudId}`, JSON.stringify(blob));
    return json({ cloudId, blob });
  }

  // POST /api/sync/:cloudId → merge an existing share.
  const cloudId = segs[0];
  const raw = await env.SHARED_LISTS.get(`list:${cloudId}`);
  const stored: Blob | null = raw ? (JSON.parse(raw) as Blob) : null;
  const merged = merge(stored, incoming, cloudId);
  await env.SHARED_LISTS.put(`list:${cloudId}`, JSON.stringify(merged));
  return json(merged);
};

export const onRequestDelete: Handler = async ({ env, params }) => {
  const segs = pathFromParams(params);
  if (segs.length === 0) return plain('cloudId required', 400);
  await env.SHARED_LISTS.delete(`list:${segs[0]}`);
  return new Response(null, { status: 204, headers: CORS });
};
