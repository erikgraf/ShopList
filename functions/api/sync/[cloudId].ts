/**
 * Cloudflare Pages Function — per-share endpoints (one path segment).
 *
 *   GET    /api/sync/:cloudId     fetch the current blob (404 if unknown)
 *   POST   /api/sync/:cloudId     merge a client snapshot in (LWW per item)
 *   DELETE /api/sync/:cloudId     revoke share
 *
 * The zero-segment create-new endpoint lives in `functions/api/sync.ts` —
 * see the note there. Auth is "possession of cloudId == access".
 */
import {
  CORS,
  json,
  merge,
  plain,
  readBody,
  type Blob,
  type Handler,
} from './_lib';

function getCloudId(params: Record<string, string | string[] | undefined>): string | null {
  const raw = params.cloudId;
  if (typeof raw === 'string' && raw.length > 0) return raw;
  return null;
}

export const onRequestOptions: Handler = () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestGet: Handler = async ({ env, params }) => {
  const id = getCloudId(params);
  if (!id) return plain('cloudId required', 400);
  const raw = await env.SHARED_LISTS.get(`list:${id}`);
  if (!raw) return plain('not found', 404);
  return new Response(raw, {
    headers: { ...CORS, 'content-type': 'application/json' },
  });
};

export const onRequestPost: Handler = async ({ env, request, params }) => {
  const id = getCloudId(params);
  if (!id) return plain('cloudId required', 400);
  const incoming = await readBody(request);
  const raw = await env.SHARED_LISTS.get(`list:${id}`);
  const stored: Blob | null = raw ? (JSON.parse(raw) as Blob) : null;
  const merged = merge(stored, incoming, id);
  await env.SHARED_LISTS.put(`list:${id}`, JSON.stringify(merged));
  return json(merged);
};

export const onRequestDelete: Handler = async ({ env, params }) => {
  const id = getCloudId(params);
  if (!id) return plain('cloudId required', 400);
  await env.SHARED_LISTS.delete(`list:${id}`);
  return new Response(null, { status: 204, headers: CORS });
};
