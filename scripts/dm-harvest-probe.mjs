// Minimal DM harvest feasibility probe through the Decodo residential proxy.
// ~12 drugstore queries, pageSize sweep, dedup by gtin → data/dm-harvest-sample.csv
import { readFile, writeFile } from 'node:fs/promises';

const devVars = await readFile('.dev.vars', 'utf8');
const proxy = devVars.match(/^HTTPS_PROXY=(.+)$/m)?.[1];
if (!proxy) throw new Error('no proxy in .dev.vars');
const { setGlobalDispatcher, ProxyAgent } = await import('undici');
setGlobalDispatcher(new ProxyAgent(proxy));
console.log('[probe] via', new URL(proxy).host);

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const QUERIES = ['shampoo','duschgel','zahnpasta','waschmittel','windeln','deo','creme','seife','spuelmittel','toilettenpapier','sonnencreme','katzenfutter'];

const byGtin = new Map();
let calls = 0, errors = 0, rateLimited = 0, totalMs = 0;

for (const q of QUERIES) {
  const url = `https://product-search.services.dmtech.com/de/search?query=${encodeURIComponent(q)}&pageSize=100`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    const ms = Date.now() - t0; totalMs += ms; calls++;
    if (res.status === 429) { rateLimited++; console.log(`[${q}] 429 rate-limited (${ms}ms)`); continue; }
    if (!res.ok) { errors++; console.log(`[${q}] ${res.status} (${ms}ms)`); continue; }
    const data = await res.json();
    const ps = data.products ?? [];
    for (const p of ps) {
      const gtin = p.gtin ? String(p.gtin) : null;
      if (!gtin || byGtin.has(gtin)) continue;
      byGtin.set(gtin, {
        gtin,
        name: p.title?.trim() ?? '',
        brand: p.brandName ?? '',
        price: p.tileData?.price?.value ?? p.price?.value ?? '',
        unit: p.contentUnit ?? '',
        category: (p.categoryNames ?? p.breadcrumbs ?? []).join?.('|') ?? '',
        url: p.relativeProductUrl ?? '',
        image: p.tileData?.image?.src ?? '',
      });
    }
    console.log(`[${q}] got=${ps.length} resultCount=${data.resultCount} unique-total=${byGtin.size} (${ms}ms)`);
  } catch (e) { errors++; console.log(`[${q}] FAIL ${e.message}`); }
  await new Promise(r => setTimeout(r, 800)); // polite spacing
}

const rows = [...byGtin.values()];
const cell = v => /[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g,'""')}"` : String(v);
const csv = ['gtin,name,brand,price,unit,category,url,image',
  ...rows.map(r => [r.gtin,r.name,r.brand,r.price,r.unit,r.category,r.url,r.image].map(cell).join(','))].join('\n');
await writeFile('data/dm-harvest-sample.csv', csv + '\n');

const cov = f => (100 * rows.filter(r => r[f]).length / rows.length).toFixed(0);
console.log(`\n[probe] DONE: ${rows.length} unique SKUs from ${calls} calls (${errors} errors, ${rateLimited} rate-limits, avg ${(totalMs/Math.max(1,calls)).toFixed(0)}ms/call)`);
console.log(`[probe] field coverage: gtin=100% name=${cov('name')}% brand=${cov('brand')}% price=${cov('price')}% unit=${cov('unit')}% category=${cov('category')}% image=${cov('image')}%`);
console.log('[probe] sample:', JSON.stringify(rows[0], null, 1).slice(0, 400));
