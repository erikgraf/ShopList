/**
 * Handler for the no-path endpoint:
 *
 *   POST /api/sync                 create a new shared list
 *
 * Lives as its own file (sibling to the `sync/` directory) because
 * Cloudflare Pages' catch-all route `[[path]].ts` requires at least one
 * path segment — `/api/sync` with no segments after wouldn't match and
 * would fall through to the static SPA. Keeping zero-segment and one-
 * segment handlers in separate files is the cleanest fix.
 */
import { CORS, json, merge, newCloudId, readBody, type Handler } from './sync/_lib';

export const onRequestOptions: Handler = () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestPost: Handler = async ({ env, request }) => {
  const incoming = await readBody(request);
  const cloudId = newCloudId();
  const blob = merge(null, incoming, cloudId);
  await env.SHARED_LISTS.put(`list:${cloudId}`, JSON.stringify(blob));
  return json({ cloudId, blob });
};
