#!/usr/bin/env node
// Streams Open Food Facts' daily JSONL dump, filters to German products,
// keeps the top-N most "complete" entries, writes a trimmed JSON snapshot.
//
// Output: public/off-de-snapshot.json
//
// Usage:
//   node scripts/build-catalog.mjs [--limit=20000] [--source=URL_OR_PATH]
//
// Source can be an http(s) URL or a local .jsonl.gz path.

import { createReadStream } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGunzip } from 'node:zlib';
import readline from 'node:readline';
import { Readable } from 'node:stream';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const DEFAULT_SOURCE = 'https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz';
const DEFAULT_LIMIT = 20000;
const OUTPUT_PATH = join(ROOT, 'public', 'off-de-snapshot.json');

function parseArgs() {
  const out = { limit: DEFAULT_LIMIT, source: DEFAULT_SOURCE };
  for (const a of process.argv.slice(2)) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (!m) continue;
    if (m[1] === 'limit') out.limit = Number(m[2]);
    else if (m[1] === 'source') out.source = m[2];
  }
  return out;
}

/** Quick prefilter on the raw JSON string — avoid JSON.parse for non-German lines. */
function passesPrefilter(line) {
  // Must look German: explicit DE country OR a German-localized name.
  if (line.includes('"product_name_de"')) return true;
  if (line.includes('"countries_tags":') && /[\"\,]\s*"en:germany"\s*[\"\,]/.test(line)) return true;
  // Some entries use "stores_tags" with German chains
  if (/"stores_tags":[^\]]*"(aldi|lidl|rewe|edeka|dm|rossmann|kaufland|netto|penny)"/i.test(line)) return true;
  return false;
}

// Tag-prefix → category. Order = priority (first match wins). Most specific first.
// A product's tags include the full ancestry chain (e.g. en:chocolate-spreads
// implies en:sweet-spreads implies en:spreads), so exact OR prefix-with-dash matches.
const CATEGORY_TAG_RULES = [
  ['baby', ['en:baby-foods', 'en:baby-products', 'en:infant-foods', 'en:infant-milks']],
  ['koerperpflege', ['en:cosmetics', 'en:hygiene-products', 'en:personal-care', 'en:body-care', 'en:hair-care', 'en:oral-care']],
  ['haushalt', ['en:household-products', 'en:detergents', 'en:cleaning-products', 'en:dishwashing']],
  ['tiefkuehl', ['en:frozen-foods', 'en:frozen-desserts']],
  ['suesses', [
    'en:chocolates', 'en:candies', 'en:cookies', 'en:biscuits', 'en:sweet-spreads',
    'en:chocolate-spreads', 'en:hazelnut-spreads', 'en:cocoa-and-hazelnuts-spreads',
    'en:snacks', 'en:sweet-snacks', 'en:salty-snacks', 'en:chips', 'en:crisps',
    'en:cakes', 'en:desserts', 'en:ice-creams', 'en:confectioneries', 'en:bars',
    'en:nuts', 'en:dried-fruits', 'en:gums', 'en:lollipops',
  ]],
  ['brot', ['en:breads', 'en:bread-products', 'en:rusks', 'en:crackers', 'en:toasts', 'en:flat-breads', 'en:viennoiseries']],
  ['milch', ['en:dairies', 'en:milks', 'en:cheeses', 'en:yogurts', 'en:butters', 'en:creams', 'en:eggs', 'en:fermented-milk-products', 'en:plant-based-milks']],
  ['fleisch', ['en:meats', 'en:fishes', 'en:seafood', 'en:sausages', 'en:hams', 'en:salamis', 'en:cooked-meats', 'en:charcuterie', 'en:poultries', 'en:beef', 'en:pork']],
  ['obst-gemuese', ['en:fruits', 'en:vegetables', 'en:fresh-vegetables', 'en:fresh-fruits', 'en:salads', 'en:legumes', 'en:mushrooms', 'en:roots', 'en:tubers', 'en:dried-fruits', 'en:canned-fruits', 'en:canned-vegetables']],
  ['getraenke', ['en:beverages', 'en:waters', 'en:juices', 'en:teas', 'en:coffees', 'en:beers', 'en:wines', 'en:spirits', 'en:soft-drinks', 'en:colas', 'en:syrups', 'en:hot-beverages', 'en:cold-beverages', 'en:non-alcoholic-beverages', 'en:alcoholic-beverages']],
  ['trocken', [
    'en:pastas', 'en:cereals', 'en:rice', 'en:flours', 'en:sugars', 'en:oils', 'en:olive-oils',
    'en:vegetable-oils', 'en:condiments', 'en:sauces', 'en:spices', 'en:salts', 'en:vinegars',
    'en:honey', 'en:syrups', 'en:dressings', 'en:soups', 'en:canned-foods', 'en:preserves',
    'en:breakfast-cereals', 'en:mueslis', 'en:granolas', 'en:ready-meals', 'en:prepared-meals',
  ]],
];

function mapCategory(tags) {
  if (!tags || !tags.length) return 'sonstiges';
  // Strip locale-prefix variants — we only care about en: taxonomy
  // but other locales (fr:, de:) sometimes carry information too.
  const set = new Set(tags);
  for (const [cat, rules] of CATEGORY_TAG_RULES) {
    for (const rule of rules) {
      if (set.has(rule)) return cat;
      // Also match descendants by prefix (e.g., en:chocolate-spreads matches en:spreads rule)
      const prefix = rule + '-';
      for (const t of tags) if (t.startsWith(prefix)) return cat;
    }
  }
  return 'sonstiges';
}

const CODE_GROUP_RE = /^(\d{3})(\d{3})(\d{3})(\d+)$/;
function formatCode(code) {
  if (!code) return null;
  // Open Food Facts normalises codes to leading zeros up to 13. Anything shorter is stored as-is.
  if (code.length < 9) return null;
  const padded = code.padStart(13, '0');
  const m = CODE_GROUP_RE.exec(padded);
  return m ? `${m[1]}/${m[2]}/${m[3]}/${m[4]}` : null;
}

const FRONT_LANG_PREFERENCE = ['de', 'en', 'fr', 'it', 'es', 'nl', 'pt'];

// Map Open Food Facts' user-contributed stores_tags to our six known store IDs.
// Tags come in a few flavours: "aldi", "aldi-nord", "aldi-sud", "dm-drogeriemarkt",
// sometimes prefixed with a locale ("de:aldi"). We normalise then match.
const STORE_TAG_MAP = [
  ['aldi', /^(de:)?aldi(-(nord|sud|sued|sü?d))?$/i],
  ['lidl', /^(de:)?lidl$/i],
  ['rewe', /^(de:)?rewe(-(center|to-go|markt|city))?$/i],
  ['edeka', /^(de:)?edeka(-.*)?$/i],
  ['dm', /^(de:)?dm(-?drogerie(-?markt)?)?$/i],
  ['rossmann', /^(de:)?rossmann$/i],
];

function mapStores(rawTags) {
  if (!rawTags || !rawTags.length) return [];
  const out = new Set();
  for (const t of rawTags) {
    for (const [storeId, re] of STORE_TAG_MAP) {
      if (re.test(t)) {
        out.add(storeId);
        break;
      }
    }
  }
  return [...out];
}

function pickFrontImage(p) {
  const code = p.code;
  if (!code) return '';
  const formatted = formatCode(code);
  if (!formatted) return '';
  const selected = (p.selected_images && p.selected_images.front) || (p.images && p.images.selected && p.images.selected.front);
  if (!selected || typeof selected !== 'object') return '';
  let langKey = null;
  for (const l of FRONT_LANG_PREFERENCE) if (selected[l]) { langKey = l; break; }
  if (!langKey) langKey = Object.keys(selected)[0];
  if (!langKey) return '';
  const entry = selected[langKey];
  const rev = entry && (entry.rev || (entry.sizes && Object.keys(entry.sizes)[0]));
  if (!rev) return '';
  return `https://images.openfoodfacts.org/images/products/${formatted}/front_${langKey}.${rev}.200.jpg`;
}

function scoreProduct(p, name, imageUrl, storesCount) {
  let s = 0;
  if (p.product_name_de && p.product_name_de.length >= 3) s += 5;
  if (name && name.length >= 3) s += 2;
  if (p.brands) s += 2;
  if (imageUrl) s += 6;
  if (p.categories_tags && p.categories_tags.length) s += 2;
  if (p.countries_tags && p.countries_tags.includes('en:germany')) s += 3;
  if (storesCount > 0) s += 2;
  if (p.completeness && typeof p.completeness === 'number') s += Math.min(5, Math.round(p.completeness * 5));
  if (p.popularity_key && typeof p.popularity_key === 'number') s += Math.min(5, Math.log10(Math.max(1, p.popularity_key)) | 0);
  return s;
}

function trim(p, imageUrl) {
  const name = p.product_name_de || p.product_name || p.generic_name_de || '';
  const brand = (p.brands || '').split(',')[0]?.trim() || '';
  const category = mapCategory(p.categories_tags);
  const stores = mapStores(p.stores_tags);
  return {
    c: p.code || '',
    n: name.trim(),
    b: brand,
    i: imageUrl || '',
    k: category,
    ...(stores.length ? { s: stores.join(',') } : {}),
  };
}

async function main() {
  const { limit, source } = parseArgs();
  console.log(`[build-catalog] limit=${limit} source=${source}`);

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });

  const gunzip = createGunzip();
  // Truncated/partial gz inputs throw Z_BUF_ERROR at end-of-stream — log and
  // proceed with whatever was decoded successfully.
  let truncated = false;
  gunzip.on('error', (err) => {
    if (err && (err.code === 'Z_BUF_ERROR' || err.code === 'Z_DATA_ERROR')) {
      truncated = true;
      console.warn(`[build-catalog] gunzip ended early (${err.code}) — using partial data`);
      gunzip.destroy();
    }
  });
  if (source.startsWith('http://') || source.startsWith('https://')) {
    const res = await fetch(source, { redirect: 'follow' });
    if (!res.ok || !res.body) throw new Error(`fetch failed: ${res.status}`);
    Readable.fromWeb(res.body).pipe(gunzip);
  } else {
    createReadStream(source).pipe(gunzip);
  }

  const rl = readline.createInterface({ input: gunzip, crlfDelay: Infinity });
  rl.on('error', (err) => {
    if (err && (err.code === 'Z_BUF_ERROR' || err.code === 'Z_DATA_ERROR')) {
      truncated = true;
    }
  });

  // Bounded min-heap-ish: keep top-N by score. Use array + periodic trim.
  let kept = []; // { score, product }
  const KEEP_THRESHOLD = limit * 2;
  let minKeptScore = -Infinity;

  let lines = 0;
  let scanned = 0;
  let parsed = 0;
  let qualified = 0;
  let bytesIn = 0;
  let lastReport = Date.now();

  gunzip.on('data', (chunk) => {
    bytesIn += chunk.length;
  });

  let lineIter;
  try {
    lineIter = rl[Symbol.asyncIterator]();
  } catch (e) {
    console.warn('[build-catalog] readline init failed:', e);
    lineIter = { async next() { return { done: true }; } };
  }
  while (true) {
    let next;
    try {
      next = await lineIter.next();
    } catch (e) {
      if (e && (e.code === 'Z_BUF_ERROR' || e.code === 'Z_DATA_ERROR')) {
        truncated = true;
        break;
      }
      throw e;
    }
    if (next.done) break;
    const line = next.value;
    lines++;
    if ((lines & 0xffff) === 0) {
      const now = Date.now();
      if (now - lastReport > 5000) {
        const mb = (bytesIn / 1024 / 1024).toFixed(0);
        console.log(
          `[build-catalog] lines=${lines} prefilter-pass=${scanned} parsed=${parsed} kept-pool=${kept.length} minScore=${minKeptScore} (~${mb}MB decompressed)`,
        );
        lastReport = now;
      }
    }

    if (!passesPrefilter(line)) continue;
    scanned++;

    let p;
    try {
      p = JSON.parse(line);
    } catch {
      continue;
    }
    parsed++;

    const name = p.product_name_de || p.product_name;
    if (!name || name.length < 2) continue;
    if (!p.code) continue;
    const imageUrl = pickFrontImage(p);
    const isDE = p.countries_tags && p.countries_tags.includes('en:germany');
    if (!imageUrl && !isDE) continue;
    const storeIds = mapStores(p.stores_tags);

    const score = scoreProduct(p, name, imageUrl, storeIds.length);
    if (kept.length >= KEEP_THRESHOLD && score <= minKeptScore) continue;

    qualified++;
    kept.push({ score, product: trim(p, imageUrl) });

    if (kept.length >= KEEP_THRESHOLD) {
      kept.sort((a, b) => b.score - a.score);
      kept = kept.slice(0, limit);
      minKeptScore = kept[kept.length - 1].score;
    }
  }

  kept.sort((a, b) => b.score - a.score);
  kept = kept.slice(0, limit);
  console.log(
    `[build-catalog] ${truncated ? 'truncated input,' : 'done.'} lines=${lines} prefilter=${scanned} parsed=${parsed} qualified=${qualified} final=${kept.length}`,
  );

  // Dedup by normalized name to drop near-duplicates with same brand
  const seen = new Set();
  const final = [];
  for (const { product } of kept) {
    const key = `${(product.b || '').toLowerCase()}|${product.n.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    final.push(product);
  }

  const payload = {
    source: 'openfoodfacts',
    generatedAt: new Date().toISOString(),
    count: final.length,
    products: final,
  };

  await writeFile(OUTPUT_PATH, JSON.stringify(payload));
  const sizeMB = (Buffer.byteLength(JSON.stringify(payload)) / 1024 / 1024).toFixed(2);
  console.log(`[build-catalog] wrote ${final.length} products -> ${OUTPUT_PATH} (${sizeMB} MB raw)`);
}

main().catch((e) => {
  console.error('[build-catalog] FAILED:', e);
  process.exit(1);
});
