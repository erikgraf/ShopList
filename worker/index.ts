/**
 * Cloudflare Worker entry point. Combines the shared-list sync API, the
 * scheduled weekly-offers fetcher, and the static asset bundle from `dist/`
 * so a single Worker serves the whole app:
 *
 *   POST   /api/sync             create a new shared list, return { cloudId, blob }
 *   GET    /api/sync/:cloudId    fetch the current blob (404 if unknown)
 *   POST   /api/sync/:cloudId    merge a client snapshot (LWW per item)
 *   DELETE /api/sync/:cloudId    revoke share
 *   GET    /__offers/run         (dev only) trigger the offers fetch and log;
 *                                gated on !request.cf so it's unreachable in prod
 *   anything else                served from ASSETS (the dist/ bundle), with
 *                                SPA fallback handled by the bundle config
 *
 * The scheduled handler runs on the cron triggers in wrangler.jsonc (weekly,
 * see Phase 1 in worker/offers.ts). It currently logs only.
 *
 * Auth model is still "possession of cloudId == access". State lives in
 * the SHARED_LISTS KV namespace bound via `wrangler.jsonc`.
 */

import { runOffers } from './offers';

export interface Env {
  SHARED_LISTS: KVNamespace;
  ASSETS: Fetcher;
}

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

function newCloudId(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let b64 = '';
  for (const b of bytes) b64 += String.fromCharCode(b);
  return btoa(b64).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function readBody(request: Request): Promise<Partial<Blob>> {
  if (!request.headers.get('content-type')?.includes('application/json')) return {};
  try {
    return (await request.json()) as Partial<Blob>;
  } catch {
    return {};
  }
}

/**
 * LWW merge of incoming snapshot into stored. Each item is keyed by id;
 * incoming wins iff its `updatedAt` is strictly newer. Tombstones older
 * than 30 days are dropped so blobs don't grow unbounded.
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

async function handleSync(request: Request, env: Env, url: URL): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS });
  }

  // `/api/sync` (no path) → create-new only handles POST.
  // `/api/sync/:cloudId` → GET / POST / DELETE on an existing share.
  const path = url.pathname.replace(/^\/api\/sync\/?/, '');
  const cloudId = path.length > 0 ? decodeURIComponent(path.split('/')[0]) : null;

  try {
    if (!cloudId) {
      if (request.method !== 'POST') return plain('method not allowed', 405);
      const incoming = await readBody(request);
      const newId = newCloudId();
      const blob = merge(null, incoming, newId);
      await env.SHARED_LISTS.put(`list:${newId}`, JSON.stringify(blob));
      return json({ cloudId: newId, blob });
    }

    if (request.method === 'GET') {
      const raw = await env.SHARED_LISTS.get(`list:${cloudId}`);
      if (!raw) return plain('not found', 404);
      return new Response(raw, { headers: { ...CORS, 'content-type': 'application/json' } });
    }

    if (request.method === 'POST') {
      const incoming = await readBody(request);
      const raw = await env.SHARED_LISTS.get(`list:${cloudId}`);
      const stored: Blob | null = raw ? (JSON.parse(raw) as Blob) : null;
      const merged = merge(stored, incoming, cloudId);
      await env.SHARED_LISTS.put(`list:${cloudId}`, JSON.stringify(merged));
      return json(merged);
    }

    if (request.method === 'DELETE') {
      await env.SHARED_LISTS.delete(`list:${cloudId}`);
      return new Response(null, { status: 204, headers: CORS });
    }

    return plain('method not allowed', 405);
  } catch (err) {
    // Surface the actual exception in the response body so the client can
    // tell the user *why* sharing failed instead of just "Teilen
    // fehlgeschlagen". Cloudflare's default 1101 swallows the message.
    const message = err instanceof Error ? err.message : String(err);
    const detail = err instanceof Error && err.stack ? err.stack.split('\n')[0] : '';
    return plain(`worker error: ${message}\n${detail}`, 500);
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/sync' || url.pathname.startsWith('/api/sync/')) {
      return handleSync(request, env, url);
    }

    // Dev-only offers trigger. Gated on the hostname being a loopback so
    // the route is unreachable from the deployed *.workers.dev origin — and
    // it's gated cleanly even though wrangler dev now populates a mocked
    // `request.cf`. Logs surface via `wrangler tail` / `wrangler dev` stdout.
    if (
      url.pathname === '/__offers/run' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
    ) {
      ctx.waitUntil(runOffers().then(() => undefined));
      return new Response('offers run kicked off — see wrangler tail / dev console\n', {
        headers: { 'content-type': 'text/plain' },
      });
    }

    // Everything else: hand off to the static asset bundle. The
    // `assets.not_found_handling: "single-page-application"` config in
    // wrangler.jsonc makes ASSETS serve `index.html` for unknown paths,
    // so client-side routes (the React app) and the SPA fallback all
    // work without us reimplementing the logic here.
    return env.ASSETS.fetch(request);
  },

  /**
   * Cron handler. Wired in wrangler.jsonc → "triggers.crons". German
   * weekly offers typically rotate Mon and Thu, so the cron fires both
   * mornings (06:00 UTC ≈ 07:00 CET / 08:00 CEST Berlin).
   *
   * Phase 1: log-only. Persistence (KV / D1) lands in Phase 2 once we've
   * reviewed the normalized shape and the per-chain coverage holds.
   */
  async scheduled(_event: ScheduledController, _env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runOffers().then(() => undefined));
  },
};
