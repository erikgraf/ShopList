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

// ─── ALDI Süd ───────────────────────────────────────────────
// Fresh-products category. Akamai blocks HEAD but lets GET through.
// Page is server-rendered AEM; tiles follow `product-tile__*` BEM classes.

async function fetchAldi(): Promise<Offer[]> {
  const URL =
    'https://www.aldi-sued.de/produkte/wochenangebote/frischeprodukte-im-angebot/k/1588161427299187';
  const res = await fetch(URL, { headers: { 'User-Agent': UA } });
  const html = await res.text();
  const tileMatches = (html.match(/product-tile__link/g) || []).length;
  console.log(`[aldi] status=${res.status} bytes=${html.length} product-tile__link hits=${tileMatches}`);
  if (!res.ok) {
    console.warn(`[aldi] non-ok status ${res.status} — body head: ${html.slice(0, 200).replace(/\s+/g, ' ')}`);
    return [];
  }

  const tileRe =
    /<a[^>]+class="[^"]*product-tile__link[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
  const out: Offer[] = [];

  let m: RegExpExecArray | null;
  while ((m = tileRe.exec(html))) {
    const [, href, tile] = m;
    const grab = (re: RegExp): string => {
      const r = tile.match(re);
      return r ? decode(r[1]) : '';
    };

    const name = grab(/class="product-tile__name"[^>]*>\s*<p[^>]*>([^<]+?)<\/p>/);
    if (!name) continue;

    const brand = grab(/class="product-tile__brandname"[^>]*>\s*<p[^>]*>([^<]+?)<\/p>/);
    const unit  = grab(/class="product-tile__unit-of-measurement"[^>]*>\s*<p>([^<]+?)<\/p>/);
    const sale  = grab(/class="base-price__discounted"[^>]*>\s*<span>([^<]+?)<\/span>/);
    const reg   = grab(/class="base-price__regular"[^>]*>\s*<span>([^<]+?)<\/span>/);
    const was   = grab(/class="base-price__was-price"[^>]*>([^<]+?)</);
    const disc  = grab(/class="base-price__discount-tag[^"]*"[^>]*>([^<]+?)</);
    const img   = grab(/src="([^"]+aldiprodeu[^"]+)"/);

    const price = parseEUR(sale || reg);
    const was_price = parseEUR(was);
    let discount_pct: number | undefined;
    if (disc) {
      const n = parseInt(disc.replace(/[^\-0-9]/g, ''), 10);
      if (Number.isFinite(n)) discount_pct = n < 0 ? n : -n;
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
  const URL = 'https://www.netto-online.de/angebote/';
  const res = await fetch(URL, { headers: { 'User-Agent': UA } });
  if (!res.ok) {
    console.warn(`[netto] status ${res.status}`);
    return [];
  }
  const html = await res.text();
  const tileCandidates = (html.match(/class="[^"]*article-tile[^"]*"/g) || []).length;
  console.log(`[netto] candidate tiles seen: ${tileCandidates} (parser TBD)`);
  // TODO: finalize tile selectors + extract.
  return [];
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
