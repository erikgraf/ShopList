# Einkaufsliste — ShopList

A German shopping list PWA. Single combined list (groceries, drugstore, household).

## Phase 1 (this branch)

Local-only, installable on iPhone. No accounts, no sync — that comes in Phase 2.

**What works**

- German UI, dark theme, iPhone-sized layout.
- Add items by typing — type-ahead pulls from four sources, in order:
  1. **Zuletzt verwendet** — your recent items.
  2. **Vorschlag** — a hand-curated catalog of German staples and brand names (`src/catalog.ts`).
  3. **Katalog** — a local snapshot of ~19 k popular German products from Open Food Facts, shipped as `public/off-de-snapshot.json` (~3 MB, real images, works offline).
  4. **Open Food Facts** — live API fallback for the long tail.
- **Barcode scanner** — ZXing via the camera. Looks up the code in the local snapshot first, then live OFF. iOS Safari needs HTTPS or `localhost`.
- Per-item quantity controls (`−` / `+`), check-off → "Erledigt" section → "Entfernen" clears all done items.
- **Faceted filtering** on the list: Status, Läden (Aldi/Lidl/Rewe/Edeka/DM/Rossmann), Kategorien, Marken. Multi-select chips with live counts; classic faceted-search semantics.
- **Faceted search dropdown**: typing "milch" shows a chip strip at the top — *Alle 39 · Milchprodukte 28 · Getränke 5 …* — tap a chip to narrow.
- Offline-first: service worker precaches the app shell + snapshot; live OFF responses are stale-while-revalidate cached.

## Local development

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build into dist/
npm run build:catalog  # rebuild the 19k-product OFF snapshot (~30 min, streams the 12 GB dump)
```

To test on your iPhone over LAN, hit the network URL Vite prints. For PWA install + barcode camera you'll need HTTPS — easiest path is deploying `dist/` to a static host (Vercel/Netlify/Cloudflare Pages), or running a local HTTPS proxy.

## Code map

- `src/App.tsx` — shell: header, search, active filters, item list, scanner modal.
- `src/components/` — `SearchBar`, `ItemRow`, `ActiveFilters`, `FilterSheet`, `Scanner` (lazy-loaded).
- `src/catalog.ts` — curated German product catalog + fast prefix/token search (handles ä/ö/ü/ß and hyphenation).
- `src/snapshot.ts` — local 19k-product snapshot loader + linear search.
- `src/openfoodfacts.ts` — OFF search + barcode lookup, with request coalescing, in-memory cache, and one-shot retry.
- `src/facets.ts` — filter state + count computation (used by both the list and the search dropdown).
- `src/db.ts` — Dexie + small pub/sub bus.
- `src/store.ts` — mutations (`addItemFromProduct`, `updateQuantity`, …) + hooks (`useItems`, `useRecent`).
- `src/barcode.ts` — ZXing wrapper, filters to numeric codes.
- `src/types.ts` — `Product`, `Item`, `Store`, `Category` definitions and labels.
- `scripts/build-catalog.mjs` — streams OFF's 12 GB JSONL dump, filters to top-N German products with images, writes `public/off-de-snapshot.json`.

## Data sources

- [Open Food Facts](https://world.openfoodfacts.org) — daily JSONL dump and live API. Data is licensed under the [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/) and product information under [CC-BY-SA](https://creativecommons.org/licenses/by-sa/3.0/). Attribution required.

## What's next

- Phase 2: shared-list sync via magic URL (no accounts). Backend TBD.
- Phase 3: native iOS port. Likely Tantivy-backed on-device search to replace the linear snapshot scan.
