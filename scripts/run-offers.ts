/**
 * Local runner for the Phase-1 weekly-offers fetchers.
 *
 *   node scripts/run-offers.ts
 *
 * Why: Akamai (ALDI Süd, Netto MD) detects Cloudflare Worker egress IPs
 * and returns 403, so the scheduled-worker path doesn't work for those
 * chains. Running the *same* `runOffers()` from a residential macOS IP
 * sidesteps the block entirely while we figure out the longer-term
 * runtime question (CF Worker + proxy vs. GitHub Actions vs. VPS).
 *
 * Uses Node 22+ type-stripping (`node --experimental-strip-types` on
 * older versions; native on Node 23.6+). Imports straight from
 * `worker/offers.ts` so the worker and CLI never drift.
 *
 * Output: aggregated normalized offers as one JSON object on stdout
 * for easy `| jq ...` piping. Per-chain diagnostic logs go to stderr.
 */
// Redirect runOffers()'s own console.log diagnostics to stderr so stdout
// stays a single clean JSON object that downstream tools can parse / pipe.
const toStderr =
  (prefix: string) =>
  (...args: unknown[]) =>
    process.stderr.write(
      prefix + args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ') + '\n',
    );
console.log = toStderr('');
console.warn = toStderr('WARN: ');
console.error = toStderr('ERR: ');

// Optional outbound HTTP(S) proxy. Used to fetch residential-IP exits for
// the chains that block Cloudflare egress (ALDI Süd / Netto MD). Wired into
// Node's global fetch via undici's ProxyAgent.
//
// Lookup order:
//   1. HTTPS_PROXY in the process env (explicit shell export wins)
//   2. .dev.vars at the repo root (same file `wrangler dev` reads;
//      gitignored via `.dev.vars*`).
// SECURITY: never commit credentials. .dev.vars is the only place creds live.
const { readFile } = await import('node:fs/promises');
const { dirname, resolve } = await import('node:path');
const { fileURLToPath } = await import('node:url');

let proxyUrl = process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY ?? '';
if (!proxyUrl) {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const text = await readFile(resolve(here, '..', '.dev.vars'), 'utf8');
    for (const line of text.split('\n')) {
      const m = line.match(/^\s*HTTPS_PROXY\s*=\s*(.+?)\s*$/);
      if (m) {
        proxyUrl = m[1].replace(/^['"]|['"]$/g, '');
        break;
      }
    }
  } catch {
    // .dev.vars absent — fine, runs unproxied.
  }
}
if (proxyUrl) {
  const { setGlobalDispatcher, ProxyAgent } = await import('undici');
  setGlobalDispatcher(new ProxyAgent(proxyUrl));
  // Don't echo creds; just confirm a proxy is active and report the egress IP.
  process.stderr.write(`[proxy] outbound via ${new URL(proxyUrl).host}\n`);
  try {
    const ip = await (await fetch('https://api.ipify.org')).text();
    process.stderr.write(`[proxy] egress IP: ${ip.trim()}\n`);
  } catch (e) {
    process.stderr.write(`[proxy] egress IP check failed: ${(e as Error).message}\n`);
  }
}

const { runOffers } = await import('../worker/offers.ts');
type Offer = Awaited<ReturnType<typeof runOffers>>[number];

const offers: Offer[] = await runOffers();

// ─── Enrichment: EAN → snapshot lookup ─────────────────────────────────
// DM's offers carry GTIN-13 for free; for those we can copy taxonomy_l3 /
// taxonomy_l2 / generic_name / category directly from the snapshot row that
// share the same code. ALDI / Netto don't expose EANs on the listing — for
// those we'd need name-based fuzzy matching against data/llm-generic-names.csv
// in a Phase-3 step. Logged as remaining gap.
const snapPath = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'off-de-snapshot.csv');
const snapText = await readFile(snapPath, 'utf8').catch(() => '');
if (snapText) {
  const [header, ...lines] = snapText.split('\n').filter(Boolean);
  const cols = header.split(',');
  const idx = (n: string) => cols.indexOf(n);
  const iCode = idx('code'), iGeneric = idx('generic');
  const iL3 = idx('taxonomy_l3'), iL2 = idx('taxonomy_l2'), iCat = idx('category');
  if (iCode >= 0) {
    type EnrichRow = { generic?: string; l3?: string; l2?: string; cat?: string };
    const byCode = new Map<string, EnrichRow>();
    for (const line of lines) {
      const f = line.split(',');
      const code = f[iCode];
      if (!code) continue;
      byCode.set(code, {
        generic: iGeneric >= 0 ? f[iGeneric] : undefined,
        l3: iL3 >= 0 ? f[iL3] : undefined,
        l2: iL2 >= 0 ? f[iL2] : undefined,
        cat: iCat >= 0 ? f[iCat] : undefined,
      });
    }
    let enriched = 0;
    for (const o of offers) {
      if (!o.ean) continue;
      const hit = byCode.get(o.ean);
      if (!hit) continue;
      o.generic_name = hit.generic || undefined;
      o.taxonomy_l3 = hit.l3 || undefined;
      o.taxonomy_l2 = hit.l2 || undefined;
      o.category = hit.cat || undefined;
      enriched++;
    }
    process.stderr.write(
      `[enrich] EAN→snapshot: ${enriched}/${offers.filter((o) => o.ean).length} offers with EAN ` +
        `enriched (${offers.length - offers.filter((o) => o.ean).length} have no EAN — name-based match TBD)\n`,
    );
  }
}

// Aggregated JSON for piping. By-chain counts are already in the
// console.log() output from runOffers(); this adds the full list so
// downstream tools can grep / jq through the actual records.
const result = {
  generated_at: new Date().toISOString(),
  total: offers.length,
  by_store: offers.reduce<Record<string, number>>((acc, o) => {
    acc[o.store] = (acc[o.store] ?? 0) + 1;
    return acc;
  }, {}),
  offers,
};

process.stdout.write(JSON.stringify(result, null, 2) + '\n');

// Optional one-shot push to a running wrangler dev. Use with:
//   node scripts/run-offers.ts --write
// or set INGEST_URL to point at a remote (once auth is in place):
//   INGEST_URL=https://shoplist.ceviche-cornet-6j.workers.dev/api/offers/ingest node ...
//
// Crucial: when HTTPS_PROXY is set, the global undici dispatcher routes
// EVERY fetch through Decodo — including the localhost POST. Use Node's
// raw http module for the loopback path so it bypasses the proxy.
if (process.argv.includes('--write')) {
  const ingestUrl = process.env.INGEST_URL ?? 'http://localhost:8788/api/offers/ingest';
  const u = new URL(ingestUrl);
  const isLoopback = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  const body = JSON.stringify(result);
  try {
    if (isLoopback) {
      const http = await import('node:http');
      const resStatus = await new Promise<{ status: number; text: string }>((res, rej) => {
        const req = http.request(
          {
            method: 'POST', hostname: u.hostname, port: u.port || 80, path: u.pathname,
            headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) },
          },
          (r) => {
            let buf = '';
            r.on('data', (c) => (buf += c));
            r.on('end', () => res({ status: r.statusCode ?? 0, text: buf.trim() }));
          },
        );
        req.on('error', rej);
        req.write(body); req.end();
      });
      process.stderr.write(`[ingest] ${ingestUrl} → ${resStatus.status} ${resStatus.text}\n`);
    } else {
      const r = await fetch(ingestUrl, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body,
      });
      process.stderr.write(`[ingest] ${ingestUrl} → ${r.status} ${(await r.text()).trim()}\n`);
    }
  } catch (e) {
    process.stderr.write(`[ingest] failed: ${(e as Error).message}\n`);
  }
}
