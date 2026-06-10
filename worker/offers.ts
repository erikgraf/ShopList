/**
 * Phase 1 — weekly offers ingestion. Log-only; no KV / D1 persistence yet.
 *
 * Drives the dormant `Item.offer?: number` field added in the redesign by
 * pulling weekly offers from each chain's *public* surface (no aggregators,
 * no ToS-grey scrapers). Triggered by the cron in wrangler.jsonc and
 * manually in dev via GET /__offers/run.
 *
 *   chain        method                                          CF Worker?
 *   ─────────────────────────────────────────────────────────────────────────
 *   ALDI Süd     HTML parse (Frischeprodukte category)           ❌ 403
 *   DM           JSON @ product-search.services.dmtech.com       ✅ works
 *   Rewe         JSON @ shop.rewe.de/api/products                ⚠️ 200 / 0
 *   Netto MD     HTML parse (/angebote/)                         ❌ 403
 *   Lidl Plus    mobile-app OAuth API                            stub
 *
 * ─── KEY FINDING from the live-fire test ────────────────────────────────
 * Akamai (ALDI, Netto) detects Cloudflare Worker egress IPs and returns 403
 * even though the same URLs work fine from a residential macOS curl. The
 * "single Cloudflare scheduled worker hits all chains" architecture only
 * holds for chains that don't aggressively filter CF IPs. For ALDI / Netto
 * we either need (a) a non-CF runtime (GitHub Actions, Hetzner box, a VPS),
 * or (b) a residential-IP proxy from the Worker. DM and Rewe seem safe
 * from CF egress; their challenge is finding the right "only-on-offer"
 * filter on what is currently a generic-query tracer.
 * ────────────────────────────────────────────────────────────────────────
 */

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';

export type Store = 'aldi' | 'dm' | 'rewe' | 'netto' | 'lidl';

/**
 * Normalized cross-chain offer record. This is the shape the future
 * /api/offers endpoint will return and that the app will join against
 * `Item.genericName` / `Item.barcode` to populate `Item.offer`.
 */
export interface Offer {
  store: Store;
  name: string;
  brand?: string;
  ean?: string;              // GTIN-13 when known (DM gives it for free)
  price?: number;            // current sale price, EUR
  was_price?: number;        // original price, EUR (if discounted)
  discount_pct?: number;     // -20, -15, … (negative number = discount)
  unit?: string;             // e.g. "1 kg", "200 g"
  image?: string;
  valid_from?: string;       // ISO date
  valid_until?: string;
  source_url: string;
  /** Enrichment populated downstream (by the ingest CLI / KV writer), not by
   *  the fetchers themselves — they only know the raw chain data. These are
   *  what the Meine % tier filter actually joins on at runtime. */
  generic_name?: string;
  taxonomy_l3?: string;
  taxonomy_l2?: string;
  category?: string;         // ShopList Category slug (obst-gemuese, getraenke, …)
}

// ─── tiny helpers ───────────────────────────────────────────

const decode = (s: string): string =>
  s
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();

const parseEUR = (s: string | undefined): number | undefined => {
  if (!s) return;
  const m = s.match(/(\d{1,3}(?:[.,]\d{1,2})?)/);
  if (!m) return;
  return parseFloat(m[1].replace(',', '.'));
};

const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Validity window for offers whose page doesn't carry explicit per-offer
 * dates. German weekly-offer pages (ALDI "Wochenangebote", Netto's grocery
 * page) show exactly this Mon–Sat week, so deriving it from the fetch date is
 * accurate, not a guess. Sundays round forward to the next Monday.
 */
export function currentOfferWeek(now: Date = new Date()): { from: string; until: string } {
  const day = now.getDay(); // 0 Sun … 6 Sat
  const mondayDelta = day === 0 ? 1 : 1 - day;
  const from = new Date(now);
  from.setDate(now.getDate() + mondayDelta);
  const until = new Date(from);
  until.setDate(from.getDate() + 5);
  return { from: isoDate(from), until: isoDate(until) };
}

/** Parse a German "DD.MM.YY" (or "DD.MM.YYYY") to an ISO date, else "". */
function germanDateToISO(s: string): string {
  const m = s.match(/(\d{2})\.(\d{2})\.(\d{2,4})/);
  if (!m) return '';
  const yr = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${yr}-${m[2]}-${m[1]}`;
}

// ─── ALDI Süd ───────────────────────────────────────────────
// Fresh-products category. Akamai blocks HEAD but lets GET through.
// Page is server-rendered AEM; tiles follow `product-tile__*` BEM classes.

// The three weekly-offers sub-categories. Frischeprodukte are "good prices"
// (rarely tagged with a percentage); Eigenmarken and Markenprodukte are
// where the explicit −N % / was-price badges live, so those two unlock
// `discount_pct` / `was_price` populating end-to-end.
const ALDI_CATEGORIES = [
  { id: 'frischeprodukte', url: 'https://www.aldi-sued.de/produkte/wochenangebote/frischeprodukte-im-angebot/k/1588161427299187' },
  { id: 'eigenmarken',     url: 'https://www.aldi-sued.de/produkte/wochenangebote/eigenmarken-im-angebot/k/1588161427299188' },
  { id: 'markenprodukte',  url: 'https://www.aldi-sued.de/produkte/wochenangebote/markenprodukte-im-angebot/k/1588161427299189' },
];

async function fetchAldi(): Promise<Offer[]> {
  // Fan out over the three sub-categories in parallel and merge.
  const settled = await Promise.allSettled(
    ALDI_CATEGORIES.map(async ({ id, url }) => {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      const html = await res.text();
      const hits = (html.match(/product-tile__link/g) || []).length;
      console.log(`[aldi:${id}] status=${res.status} bytes=${html.length} product-tile__link hits=${hits}`);
      if (!res.ok) {
        console.warn(`[aldi:${id}] non-ok status ${res.status} — body head: ${html.slice(0, 200).replace(/\s+/g, ' ')}`);
        return [];
      }
      return parseAldiTiles(html);
    }),
  );

  // Merge + dedup by source_url (a SKU can occasionally appear under both
  // Frischeprodukte and Eigenmarken if Aldi categorizes loosely).
  const seen = new Set<string>();
  const out: Offer[] = [];
  let drops = 0;
  for (const r of settled) {
    if (r.status !== 'fulfilled') continue;
    for (const o of r.value) {
      const key = o.source_url || o.name;
      if (seen.has(key)) { drops++; continue; }
      seen.add(key);
      out.push(o);
    }
  }
  if (drops) console.log(`[aldi] deduped ${drops} cross-category duplicates`);
  return out;
}

// Same parser, just factored out so each category page reuses it.
function parseAldiTiles(html: string): Offer[] {
  // Attributes can come in either order in the rendered HTML (href= is
  // sometimes before class=, sometimes after). Match the <a>…</a> by the
  // class anywhere in the opening tag, then pull `href` out of the captured
  // attribute block separately.
  const tileRe = /<a\s([^>]*class="[^"]*product-tile__link[^"]*"[^>]*)>([\s\S]*?)<\/a>/g;
  const out: Offer[] = [];

  let m: RegExpExecArray | null;
  while ((m = tileRe.exec(html))) {
    const [, attrs, tile] = m;
    const hrefMatch = attrs.match(/href="([^"]+)"/);
    const href = hrefMatch ? hrefMatch[1] : '';
    const grab = (re: RegExp): string => {
      const r = tile.match(re);
      return r ? decode(r[1]) : '';
    };

    const name = grab(/class="product-tile__name"[^>]*>\s*<p[^>]*>([^<]+?)<\/p>/);
    if (!name) continue;

    const brand = grab(/class="product-tile__brandname"[^>]*>\s*<p[^>]*>([^<]+?)<\/p>/);
    const unit  = grab(/class="product-tile__unit-of-measurement"[^>]*>\s*<p>([^<]+?)<\/p>/);
    // Prices live inside <ins>/<del>, but the cleanest signal is the
    // aria-label that screen-reader markup carries on each price element:
    //   aria-label="Reduzierter Preis: 0,79 €"   ← sale price
    //   aria-label="Originalpreis: 0,99 €"       ← was price
    //   aria-label="Spare 20%"                   ← discount tag
    // Tiles without a discount only have a `base-price__regular` block; for
    // those we fall back to the inner text of <ins>/<span> for the regular.
    const sale = grab(/aria-label="Reduzierter Preis:\s*([^"]+?)"/);
    const was  = grab(/aria-label="Originalpreis:\s*([^"]+?)"/);
    const disc = grab(/aria-label="Spare\s*([^"]+?)"/);
    const reg  = grab(/class="base-price__regular"[^>]*>\s*<(?:span|ins)>([^<]+?)<\/(?:span|ins)>/);
    const img  = grab(/src="([^"]+aldiprodeu[^"]+)"/);

    const price = parseEUR(sale || reg);
    const was_price = parseEUR(was);
    let discount_pct: number | undefined;
    if (disc) {
      const n = parseInt(disc.replace(/[^\-0-9]/g, ''), 10);
      if (Number.isFinite(n) && n > 0) discount_pct = -n;
    } else if (was_price && price && was_price > price) {
      discount_pct = -Math.round((1 - price / was_price) * 100);
    }

    out.push({
      store: 'aldi',
      name,
      brand: brand || undefined,
      price,
      was_price,
      discount_pct,
      unit: unit || undefined,
      image: img || undefined,
      source_url: href.startsWith('http') ? href : `https://www.aldi-sued.de${href}`,
    });
  }

  return out;
}

// ─── DM ─────────────────────────────────────────────────────
// Public JSON used by dm.de itself. Returns GTIN/EAN, brand, title, price,
// per-unit "Grundpreis", image. Rate-limited (429 after a few rapid calls);
// the weekly cadence sits well inside that ceiling.
//
// TODO: discover the "only-on-offer" filter. Today we tracer with a generic
// "angebot" query and let downstream filter on `discount_pct != undefined`.

async function fetchDm(): Promise<Offer[]> {
  const URL =
    'https://product-search.services.dmtech.com/de/search?query=angebot&pageSize=20';
  const res = await fetch(URL, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
  if (res.status === 429) {
    console.warn('[dm] rate-limited (429)');
    return [];
  }
  if (!res.ok) {
    console.warn(`[dm] status ${res.status}`);
    return [];
  }
  const data = (await res.json()) as { products?: DmProduct[]; resultCount?: number };
  const products = data.products ?? [];
  if (products[0]) {
    const sampleKeys = Object.keys(products[0]).slice(0, 12);
    console.log(`[dm] resultCount=${data.resultCount} sample keys=${JSON.stringify(sampleKeys)}`);
    // One-time dump of the first product so we can see where prices/URLs live
    if (process.env.DEBUG_DM === '1') {
      console.log('[dm] first product full JSON:\n' + JSON.stringify(products[0], null, 2));
    }
  }

  return products
    .map<Offer | null>((p) => {
      const name = p.title?.trim();
      if (!name) return null;
      const price = p.tileData?.price?.value ?? p.price?.value;
      const was_price = p.tileData?.crossedOutPrice?.value;
      let discount_pct: number | undefined;
      if (was_price && price && was_price > price) {
        discount_pct = -Math.round((1 - price / was_price) * 100);
      }
      return {
        store: 'dm',
        name,
        brand: p.brandName ?? undefined,
        ean: p.gtin ? String(p.gtin) : undefined,
        price,
        was_price,
        discount_pct,
        unit: p.contentUnit ?? undefined,
        image: p.tileData?.image?.src,
        source_url: p.relativeProductUrl ? `https://www.dm.de${p.relativeProductUrl}` : '',
      };
    })
    .filter((x): x is Offer => x !== null);
}

interface DmProduct {
  gtin?: number;
  brandName?: string;
  title?: string;
  contentUnit?: string;
  relativeProductUrl?: string;
  price?: { value?: number };
  tileData?: {
    price?: { value?: number };
    crossedOutPrice?: { value?: number };
    image?: { src?: string };
  };
}

// ─── Rewe ───────────────────────────────────────────────────
// shop.rewe.de's own product-search JSON. No auth required for plain queries;
// pricing lives under `articles[0].listing.pricing.{currentRetailPrice,
// regularRetailPrice}`.
//
// TODO: discover the offer-only listing endpoint (the /angebote page must
// drive one). For now this is a tracer that confirms the shape.

async function fetchRewe(): Promise<Offer[]> {
  const URL =
    'https://shop.rewe.de/api/products?objectsPerPage=20&search=angebot&serviceTypes=PICKUP&sorting=RELEVANCE_DESC';
  const res = await fetch(URL, {
    headers: { 'User-Agent': UA, Accept: 'application/json', Referer: 'https://shop.rewe.de/' },
  });
  console.log(`[rewe] status=${res.status}`);
  if (!res.ok) {
    return [];
  }
  const data = (await res.json()) as { products?: ReweProduct[] };
  const products = data.products ?? [];
  if (products[0]) {
    console.log(`[rewe] sample keys=${JSON.stringify(Object.keys(products[0]).slice(0, 12))}`);
  } else {
    console.log('[rewe] zero products returned (empty results, not a fetch error)');
  }

  return products
    .map<Offer | null>((p) => {
      const name = p.productName ?? p.title ?? '';
      if (!name) return null;
      const pricing = p.articles?.[0]?.listing?.pricing;
      const price = pricing?.currentRetailPrice;
      const was_price =
        pricing?.regularRetailPrice && pricing.regularRetailPrice !== price
          ? pricing.regularRetailPrice
          : undefined;
      let discount_pct: number | undefined;
      if (was_price && price && was_price > price) {
        discount_pct = -Math.round((1 - price / was_price) * 100);
      }
      return {
        store: 'rewe',
        name,
        brand: p.brandName,
        ean: p.articles?.[0]?.gtin,
        price,
        was_price,
        discount_pct,
        image: p.media?.images?.[0]?.url,
        source_url: p.url ?? '',
      };
    })
    .filter((x): x is Offer => x !== null);
}

interface ReweProduct {
  productName?: string;
  title?: string;
  brandName?: string;
  url?: string;
  articles?: Array<{
    gtin?: string;
    listing?: { pricing?: { currentRetailPrice?: number; regularRetailPrice?: number } };
  }>;
  media?: { images?: Array<{ url?: string }> };
}

// ─── Netto MD ───────────────────────────────────────────────
// Server-renders 70 KB of tile-classed markup; parser is TBD pending a
// closer look at the real tile structure (my first regex aimed at <article>
// missed because the real container is a <div class="article-tile…">).

async function fetchNetto(): Promise<Offer[]> {
  // /angebote/ leans toward non-food (Balkonkraftwerk, Whirlpool, …) on
  // Netto MD. The Lebensmittel sub-category is where the grocery deals live.
  const URL = 'https://www.netto-online.de/lebensmittel-angebote/c-N07941';
  const res = await fetch(URL, { headers: { 'User-Agent': UA } });
  if (!res.ok) {
    console.warn(`[netto] status ${res.status}`);
    return [];
  }
  const html = await res.text();

  // Each Netto tile is a <... class="product-list__item …"> wrapper, but the
  // wrapper ELEMENT varies (<article> / <li> / <div>) per section. Matching
  // "tile open … wrapper close-tag" is fragile: with mixed wrappers a lazy
  // [\s\S]*? can run from an <li>-tile to a distant </article> and swallow
  // every tile in between. So instead, split the document AT each tile start
  // — each chunk runs to just before the next tile, no close-tag needed.
  // Inside a tile: product__title (name as direct text), tc-product-price
  // `<strong>NN.<span>CC</span></strong>` (euros literal, cents wrapped).
  // No was-price yet: Netto reveals it via a JS-rendered tooltip.
  const chunks = html.split(/(?=<[a-z][^>]*class="[^"]*\bproduct-list__item\b)/);
  chunks.shift(); // preamble before the first tile

  const out: Offer[] = [];
  for (const raw of chunks) {
    // The final chunk runs to the end of the document — cap it so footer
    // markup can't bleed into the image/href grabs.
    const tile = raw.slice(0, 6000);
    const grab = (re: RegExp): string => {
      const r = tile.match(re);
      return r ? decode(r[1]) : '';
    };

    // Title text sits directly inside the title element (no inner wrapper).
    const name =
      grab(/class="[^"]*\bproduct__title\b[^"]*"[^>]*>\s*([^<]+?)\s*</) ||
      grab(/class="[^"]*\btc-product-name\b[^"]*"[^>]*>\s*([^<]+?)\s*</);
    if (!name) continue;

    // Two price variants in the wild:
    //  - shop tiles:  <div class="… tc-product-price"><strong>NN.<span>CC</span></strong>
    //  - flyer tiles: <ins class="product__current-price tc-product-price"> NN.<span>CC</span><span>*</span></ins>
    // Either way the euros are literal text and the cents sit in a span —
    // strip tags and let parseEUR sort it out.
    const priceBlock =
      grab(/<div[^>]*class="[^"]*\btc-product-price\b[^"]*"[^>]*>\s*<strong>([\s\S]*?)<\/strong>/) ||
      grab(/<ins[^>]*class="[^"]*\btc-product-price\b[^"]*"[^>]*>([\s\S]*?)<\/ins>/);
    const price = parseEUR(priceBlock.replace(/<[^>]+>/g, ''));

    // Flyer tiles also carry the strikethrough UVP and an explicit percent
    // badge ("-29 %") — the was-price we previously believed needed a JS
    // render.
    const was_price = parseEUR(
      grab(/<del[^>]*class="[^"]*\bproduct__old-price\b[^"]*"[^>]*>([\s\S]*?)<\/del>/).replace(/UVP/i, ''),
    );
    const discRaw = grab(/class="[^"]*\bproduct__percent-saving__text\b[^"]*"[^>]*>([\s\S]*?)</);
    let discount_pct: number | undefined;
    const dn = parseInt(discRaw.replace(/[^\-0-9]/g, ''), 10);
    if (Number.isFinite(dn) && dn !== 0) discount_pct = dn > 0 ? -dn : dn;
    if (discount_pct === undefined && was_price && price && was_price > price) {
      discount_pct = -Math.round((1 - price / was_price) * 100);
    }

    // The add-to-wishlist href carries structured params: BundleText (unit,
    // e.g. "1 kg") and ValidTo — free metadata, no extra fetch.
    const unitRaw = grab(/[?&]BundleText=([^&"]*)/);
    const unit = unitRaw ? decodeURIComponent(unitRaw.replace(/\+/g, ' ')).trim() : '';
    // ValidTo → until (e.g. "2026-06-13 20:00:00"); ValidityPeriod carries
    // the human "gültig von Montag, 08.06.26 - Samstag, 13.06.26" → von.
    const validToRaw = grab(/[?&]ValidTo=([^&"]*)/);
    const validTo = validToRaw
      ? decodeURIComponent(validToRaw.replace(/\+/g, ' ')).slice(0, 10)
      : '';
    const periodRaw = grab(/[?&]ValidityPeriod=([^&"]*)/);
    const validFrom = periodRaw
      ? germanDateToISO(decodeURIComponent(periodRaw.replace(/\+/g, ' ')))
      : '';

    const brand = grab(/class="[^"]*\bproduct__brand\b[^"]*"[^>]*>([^<]+?)</);
    const img   = grab(/src="([^"]+netto-online\.de[^"]+\.(?:jpg|webp|png)[^"]*)"/);

    // Per-product detail link when the tile carries one; else a name-slug
    // fragment. source_url must be DISTINCT per offer — a constant URL made
    // every Netto offer share one identity downstream (dup-merged items,
    // colliding list-chip keys).
    const href = grab(/<a[^>]+href="(\/[^"]+|https?:\/\/[^"]+)"/);
    const slug = name.toLowerCase().replace(/[^a-z0-9äöüß]+/gi, '-').replace(/^-+|-+$/g, '');
    const source_url = href
      ? href.startsWith('http')
        ? href
        : `https://www.netto-online.de${href}`
      : `${URL}#${slug}`;

    out.push({
      store: 'netto',
      name,
      brand: brand || undefined,
      price,
      was_price,
      discount_pct,
      unit: unit || undefined,
      image: img || undefined,
      valid_from: validFrom || undefined,
      valid_until: validTo || undefined,
      source_url,
    });
  }
  return out;
}

// ─── Lidl Plus ──────────────────────────────────────────────
// Lidl's web shop is a flyer viewer (no SKU surface). The productive path
// is the Lidl Plus mobile app, which talks to a reverse-engineered REST API
// requiring phone-number OAuth (one-time). Phase 2.

async function fetchLidlPlus(): Promise<Offer[]> {
  // TODO:
  //  1. one-time: register a Lidl Plus account, capture the bearer token
  //     (or refresh flow), store in env.LIDL_PLUS_TOKEN secret;
  //  2. GET https://api.lidl-plus.de/...  /promotions endpoint;
  //  3. normalize to Offer[].
  return [];
}

// ─── orchestrator ──────────────────────────────────────────

const FETCHERS: Array<{ store: Store; fn: () => Promise<Offer[]> }> = [
  { store: 'aldi',  fn: fetchAldi },
  { store: 'dm',    fn: fetchDm },
  { store: 'rewe',  fn: fetchRewe },
  { store: 'netto', fn: fetchNetto },
  { store: 'lidl',  fn: fetchLidlPlus },
];

/**
 * Run all chain fetchers in parallel; aggregate + log a sample. Returns the
 * full normalized list for future persistence.
 */
export async function runOffers(): Promise<Offer[]> {
  const t0 = Date.now();
  const settled = await Promise.allSettled(FETCHERS.map((f) => f.fn()));

  const all: Offer[] = [];
  settled.forEach((r, i) => {
    const { store } = FETCHERS[i];
    if (r.status === 'fulfilled') {
      const n = r.value.length;
      const withDeals = r.value.filter((o) => o.discount_pct).length;
      console.log(`[${store}] ${n} offers (${withDeals} with explicit discount)`);
      all.push(...r.value);
    } else {
      console.error(`[${store}] FAILED:`, r.reason);
    }
  });

  // Every offer must carry a validity window. Netto extracts real dates from
  // its tile hrefs; ALDI/DM weekly-offer pages don't expose per-offer dates,
  // so they inherit the current Mon–Sat offer week (accurate: the pages are
  // definitionally "this week's offers"). Stores are mixed in the feed, so
  // each offer carries its own window for the per-card "Gültig …" stamp.
  const week = currentOfferWeek();
  for (const o of all) {
    if (!o.valid_from) o.valid_from = week.from;
    if (!o.valid_until) o.valid_until = week.until;
  }

  console.log(
    `[offers] total=${all.length} elapsed=${Date.now() - t0}ms by-store=` +
      JSON.stringify(
        Object.fromEntries(FETCHERS.map(({ store }) => [store, all.filter((o) => o.store === store).length])),
      ),
  );

  // First 8 normalized records — enough to review the shape end-to-end.
  console.log('[offers] sample:\n' + JSON.stringify(all.slice(0, 8), null, 2));

  return all;
}
