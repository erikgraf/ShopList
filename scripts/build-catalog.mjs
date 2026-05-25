#!/usr/bin/env node
// Streams Open Food Facts' daily JSONL dump, filters to German products,
// keeps the top-N most "complete" entries, writes a trimmed CSV snapshot.
//
// Output: public/off-de-snapshot.csv
//
// Usage:
//   node scripts/build-catalog.mjs [--limit=20000] [--source=URL_OR_PATH]
//
// Source can be an http(s) URL or a local .jsonl.gz path.

import { createReadStream, existsSync, statSync, readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGunzip } from 'node:zlib';
import readline from 'node:readline';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const DEFAULT_SOURCE = 'https://static.openfoodfacts.org/data/openfoodfacts-products.jsonl.gz';
const DEFAULT_LIMIT = 20000;
const DEFAULT_CACHE_PATH = join(tmpdir(), 'shoplist-off-dump.jsonl.gz');
const OUTPUT_PATH = join(ROOT, 'public', 'off-de-snapshot.csv');
// Rich analysis export — all OFF metadata, not shipped (gitignored). For data
// analysis only; regenerated alongside the lean snapshot on every run.
const RICH_OUTPUT_PATH = join(ROOT, 'data', 'off-de-full.csv');

function parseArgs() {
  const out = {
    limit: DEFAULT_LIMIT,
    source: DEFAULT_SOURCE,
    cache: DEFAULT_CACHE_PATH,
    forceDownload: false,
  };
  for (const a of process.argv.slice(2)) {
    const m = /^--([^=]+)(?:=(.*))?$/.exec(a);
    if (!m) continue;
    if (m[1] === 'limit') out.limit = Number(m[2]);
    else if (m[1] === 'source') out.source = m[2];
    else if (m[1] === 'cache') out.cache = m[2];
    else if (m[1] === 'force-download') out.forceDownload = true;
  }
  return out;
}

/**
 * Download an HTTPS resource to a local file using curl, with resume + retry.
 * Streams from Node's fetch are fragile over 30-60 min runs against the OFF
 * CDN — ECONNRESET kills the run with no recovery. curl's `--continue-at -`
 * + `--retry-all-errors` resumes cleanly and is the canonical tool for this
 * job. We shell out rather than reimplement.
 */
async function downloadWithResume(url, dest, { force = false } = {}) {
  await mkdir(dirname(dest), { recursive: true });

  // If we already have the file and HEAD says the size matches, skip the download.
  if (!force && existsSync(dest)) {
    try {
      const head = await fetch(url, { method: 'HEAD', redirect: 'follow' });
      const remoteSize = Number(head.headers.get('content-length') || 0);
      const localSize = statSync(dest).size;
      if (remoteSize > 0 && localSize === remoteSize) {
        console.log(`[build-catalog] cache hit: ${dest} (${(localSize / 1024 / 1024).toFixed(0)} MB)`);
        return dest;
      }
      console.log(
        `[build-catalog] cache size ${localSize} differs from remote ${remoteSize} — resuming download`,
      );
    } catch (e) {
      console.warn('[build-catalog] HEAD check failed, will resume anyway:', e.message);
    }
  }

  console.log(`[build-catalog] downloading ${url} → ${dest} (resume + retry)`);
  await new Promise((resolve, reject) => {
    const args = [
      '-L', // follow redirects
      '--retry', '8',
      '--retry-all-errors',
      '--retry-delay', '5',
      '--continue-at', '-',
      '--max-time', '7200',
      '-o', dest,
      url,
    ];
    const child = spawn('curl', args, { stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`curl exited with code ${code}`));
    });
  });
  console.log(
    `[build-catalog] download done: ${(statSync(dest).size / 1024 / 1024).toFixed(0)} MB`,
  );
  return dest;
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

// OFF tag → category rules, loaded from data/category-rules.csv — the editable
// source of truth (see data/README.md). Rows are pre-sorted by priority; a
// product's tags include the full ancestry chain so exact / prefix-with-dash
// matches. Reconstructed here as [category, [tags…]] in priority order.
const CATEGORY_TAG_RULES = (() => {
  const text = readFileSync(join(ROOT, 'data', 'category-rules.csv'), 'utf8');
  const byCat = new Map();
  const order = [];
  for (const line of text.trim().split('\n').slice(1)) {
    const [, category, offTag] = line.split(',');
    if (!category || !offTag) continue;
    if (!byCat.has(category)) { byCat.set(category, []); order.push(category); }
    byCat.get(category).push(offTag.trim());
  }
  return order.map((c) => [c, byCat.get(c)]);
})();

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

// Rich row for the analysis export (data/off-de-full.csv) — every OFF field
// worth analysing. Separate from the lean runtime snapshot so the shipped
// download stays small. List-valued fields are `|`-joined.
const RICH_COLUMNS = [
  'code', 'name', 'generic_name', 'brand', 'brands', 'category', 'off_categories',
  'stores', 'countries', 'quantity', 'packaging', 'labels', 'nutriscore', 'nova_group',
  'ecoscore', 'energy_kcal_100g', 'fat_100g', 'saturated_fat_100g', 'carbohydrates_100g',
  'sugars_100g', 'fiber_100g', 'proteins_100g', 'salt_100g', 'ingredients_text',
  'allergens', 'additives_n', 'completeness', 'popularity_key', 'image',
];

function richRow(p, imageUrl) {
  const nut = p.nutriments || {};
  const num = (v) => (typeof v === 'number' ? v : '');
  const tags = (t) => (Array.isArray(t) ? t.join('|') : '');
  return {
    code: p.code || '',
    name: (p.product_name_de || p.product_name || p.generic_name_de || '').trim(),
    generic_name: (p.generic_name_de || p.generic_name || '').trim(),
    brand: (p.brands || '').split(',')[0]?.trim() || '',
    brands: p.brands || '',
    category: mapCategory(p.categories_tags),
    off_categories: tags(p.categories_tags),
    stores: mapStores(p.stores_tags).join('|'),
    countries: tags(p.countries_tags),
    quantity: p.quantity || '',
    packaging: tags(p.packaging_tags),
    labels: tags(p.labels_tags),
    nutriscore: p.nutriscore_grade || p.nutrition_grades || '',
    nova_group: num(p.nova_group),
    ecoscore: p.ecoscore_grade || '',
    energy_kcal_100g: num(nut['energy-kcal_100g']),
    fat_100g: num(nut.fat_100g),
    saturated_fat_100g: num(nut['saturated-fat_100g']),
    carbohydrates_100g: num(nut.carbohydrates_100g),
    sugars_100g: num(nut.sugars_100g),
    fiber_100g: num(nut.fiber_100g),
    proteins_100g: num(nut.proteins_100g),
    salt_100g: num(nut.salt_100g),
    ingredients_text: (p.ingredients_text_de || p.ingredients_text || '').trim(),
    allergens: tags(p.allergens_tags),
    additives_n: num(p.additives_n),
    completeness: num(p.completeness),
    popularity_key: num(p.popularity_key),
    image: imageUrl || '',
  };
}

async function main() {
  const { limit, source, cache, forceDownload } = parseArgs();
  console.log(`[build-catalog] limit=${limit} source=${source}`);

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });

  // Resolve to a local file: HTTPS sources go through curl-with-resume into a
  // cache file. Local paths are read directly.
  let localPath;
  if (source.startsWith('http://') || source.startsWith('https://')) {
    localPath = await downloadWithResume(source, cache, { force: forceDownload });
  } else {
    localPath = source;
  }

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
  createReadStream(localPath).pipe(gunzip);

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
    kept.push({ score, product: trim(p, imageUrl), rich: richRow(p, imageUrl) });

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

  // Dedup by normalized name to drop near-duplicates with same brand. Keep the
  // whole entry (lean product + rich row) so both exports stay aligned.
  const seen = new Set();
  const final = [];
  for (const entry of kept) {
    const { product } = entry;
    const key = `${(product.b || '').toLowerCase()}|${product.n.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    final.push(entry);
  }

  const csvCell = (v) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  // 1) Lean runtime snapshot (shipped, loaded by src/snapshot.ts):
  //    code,name,brand,image,category,stores — stores `|`-joined.
  const leanLines = ['code,name,brand,image,category,stores'];
  for (const { product: p } of final) {
    leanLines.push(
      [p.c || '', p.n || '', p.b || '', p.i || '', p.k || '', (p.s || '').replace(/,/g, '|')]
        .map(csvCell)
        .join(','),
    );
  }
  const leanCsv = leanLines.join('\n') + '\n';
  await writeFile(OUTPUT_PATH, leanCsv);
  const leanMB = (Buffer.byteLength(leanCsv) / 1024 / 1024).toFixed(2);
  console.log(`[build-catalog] wrote ${final.length} products -> ${OUTPUT_PATH} (${leanMB} MB)`);

  // 2) Rich analysis export (NOT shipped, gitignored): all metadata for
  //    data analysis. See data/README.md.
  const richLines = [RICH_COLUMNS.join(',')];
  for (const { rich } of final) {
    richLines.push(RICH_COLUMNS.map((c) => csvCell(rich[c])).join(','));
  }
  const richCsv = richLines.join('\n') + '\n';
  await mkdir(dirname(RICH_OUTPUT_PATH), { recursive: true });
  await writeFile(RICH_OUTPUT_PATH, richCsv);
  const richMB = (Buffer.byteLength(richCsv) / 1024 / 1024).toFixed(2);
  console.log(`[build-catalog] wrote ${final.length} rich rows -> ${RICH_OUTPUT_PATH} (${richMB} MB)`);
}

main().catch((e) => {
  console.error('[build-catalog] FAILED:', e);
  process.exit(1);
});
