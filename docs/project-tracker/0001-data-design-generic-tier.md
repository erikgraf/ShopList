# 0001 — Data Design: the generic-product tier

| Field    | Value                                                                                   |
| -------- | --------------------------------------------------------------------------------------- |
| Date     | 2026-05-25                                                                              |
| Status   | Prototype — committed locally on `claude/generic-tier-prototype` (`889a8e8`), push pending |
| Touches  | `src/generics.ts`, `src/types.ts`, `src/store.ts`, `src/db.ts`, `src/components/SearchBar.tsx`, `src/generics.test.ts`, `vitest.config.ts` |

---

## 1. Original prompt (verbatim)

> So I have been working on this shopping list app.
> There are several lists and categories and mappings between those.
>
> It is supposed to be an easy shopping list with:
>
> * Ease of adding
> *        good autocompleting support
> *        Good listing breadth
> *        Add via barcode scan
> * Support of having one list and
> * Generate sublist based on selecting stores
> * Match offers
>
> So as I see it:
> We have a list of groceries and toiletry and general shopping categories .
> We have a list of generic products such as  yoghurt , lactose free yoghurt, Greek yoghurt , speisequark magerstufe, spq 20% , spq 40%
> We have a mapping between generic products and categories
> We have a list of actual products
>
> * these could come with meat info
> * Stores that sell them
> * Price
> * Bio , Demeter status
> * Rating
> * Mapping to generic product
> * Mapping to categories
> * Users should be able to scan barcodes and map products based on this into this
>
> A) give a nice representation of this. Did we forget something
> B) provide inside how to build or update those
> C) how to best map user input to this

---

## 2. Analysis / thoughts

### Headline finding

The mental model has **three tiers** — Category → Generic product → Actual
product. The code had **two** (`Product`, `Item`), and the missing middle tier
("Joghurt" as a concept) was **smeared across three unconnected places** that
didn't reference each other:

| "Joghurt" lived as…           | Where                       | Keyed by             | Held                              |
| ----------------------------- | --------------------------- | -------------------- | --------------------------------- |
| a flat catalog row `local:joghurt` | `catalog.ts`           | slug id              | name, category, icon, stores      |
| a brand-map entry `joghurt`   | `store-brands.ts`           | lowercase **substring** | per-store private labels + bio    |
| a display label               | `store-brands.ts` (`KEY_LABELS`) | substring key   | the noun "Joghurt"                |

There was **no `genericId`** on `Product` or `Item`, so "Griechischer Joghurt",
"Joghurt laktosefrei" and a scanned Landliebe tub were three independent
`Product`s with no parent and no link to the brand map. Unifying this one
entity is what unlocks the requested attributes (bio/Demeter/rating/price all
hang off the generic or the SKU; variants need a parent link).

### Current model (as built before this entry)

```
Category (14 enum + grocery/drugstore kind + walk-order)
   ▲ (string field, 1 per product)
Product { id, name, brand?, image?, category, barcode?, stores?, icon?, sizes? }
   │        ← conflated "generic" (local:joghurt) AND "actual" (barcode SKU)
   ▼ (denormalized snapshot at add-time)
Item     { …Product fields, listId, quantity, unit:'Stk', checked, brand,
           brandByStore, position, addedAt, updatedAt, deletedAt? }
ShopList { id, name, position, cloud? }
```

Knowledge sources merged at search time: recent → `CURATED_CATALOG` → 19k OFF
`snapshot.json` → live Open Food Facts.

### Proposed model (target)

```
Category ──┐
           │ 1:N
        Generic { id, name, category, parentId?, aliases[], icon, brandKey,
                  defaultUnit, defaultStores }      ← NEW concept tier
           │ 1:N
        Product { id(=barcode), genericId,          ← NEW FK
                  name, brand, image,
                  bio?, demeter?, husbandry?(1–4),  ← NEW attributes
                  rating?, packSize{value,unit} }
           │ 1:N (time-varying, per store)
        Offer  { productId|genericId, store, price, ← NEW entity → "match offers"
                 unitPrice, validFrom, validTo, source }
```

### What we forgot (gaps)

1. **The generic tier itself** — the missing `genericId` FK (addressed in this prototype).
2. **Units / variant axes.** `Item.unit` was hardcoded `'Stk'`. "SPQ 20%" vs "40%", "Magerstufe" are variants along an axis (fat %, lactose, pack size).
3. **Price / offers.** Absent (a comment in `ItemRow.tsx` parks it). A separate time-bounded entity, not a product field.
4. **Bio / Demeter as data.** Only existed as a *suggestion preference* (`preferBio`) that swaps the brand string — not a filterable attribute of a product.
5. **Rating and meat info (Haltungsform 1–4).** Not modeled.
6. **Store availability is coarse.** `Product.stores` is derived from category defaults, not real "this SKU is sold at Lidl" data.

Not forgotten: "generate sublist by selecting stores" is essentially **already
done** via faceted filtering on `Läden` (`facets.ts`).

### Build/update strategy (B)

- **Generics** → author-time in code (`generics.ts`), merging the three scattered representations. Cheapest, reviewable, offline.
- **Products (SKUs)** → keep the Open Food Facts pipeline (`scripts/build-catalog.mjs` → `off-de-snapshot.json`); widen the row trimmer to carry bio/labels/packaging.
- **Feedback loop** already exists: `UnknownBarcode` + `GapFinder.tsx` (`#unknowns`).
- **Offers** → the hard one. No clean free API for chain prices; realistic sources are marktguru/Kaufda scraping or loyalty APIs. Model as a synced server table refreshed by a worker job — never bake into the static snapshot (prices rot weekly).

### Input-mapping strategy (C)

Resolve every input to a `genericId` first, then optionally a `productId`.

- **Typing** → rank generic match first, surface SKUs under the matched generic; fold `aliases[]` into the index ("spq" → Speisequark).
- **Barcode scan** → after the OFF lookup + `genericName()` cleanup, assign a `genericId` so a scan and a typed item land on the same logical row.
- **Footgun fixed** → `matchItemKey`'s `includes()` substring match (sorted by key length) is fragile as the map grows ("Buttermilch" hits both `butter` and `milch`). Whole-token alias matching removes the ordering hazard.

---

## 3. Work done (this entry)

A complete vertical slice introducing the generic tier + a visible payoff in the autocomplete.

| File                          | Change                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/generics.ts` (new)       | `Generic` entity + registry with a **parent/variant hierarchy** and **aliases**; `resolveGeneric(name, category)` matcher; `searchGenerics`; `rootGeneric` / `variantsOf` / `brandKeyForGeneric` / `iconForGeneric` inheritance helpers; `genericToProduct`. |
| `src/types.ts`                | Optional `genericId` on `Product` and `Item`.                                                  |
| `src/store.ts`                | Stamp `genericId` on add (explicit on the product > resolved from name + category) so typed and scanned items land on the same logical row. |
| `src/db.ts`                   | Dexie **v9** migration: adds the `genericId` index and backfills existing items by resolving from name + category. |
| `src/components/SearchBar.tsx`| **Grouped autocomplete**: suggestions nest under their root generic (umbrella header + variants/SKUs); injects generic-only variants that have no catalog/OFF SKU yet (e.g. Speisequark 20%/40%). |
| `src/generics.test.ts` (new)  | 11 vitest cases: resolver (incl. `spq 20%`, `greek yoghurt`, verbose names), hierarchy, search. |
| `vitest.config.ts` (new)      | Standalone config so vitest skips the Cloudflare-plugin Vite config under test.                |
| `package.json`                | `vitest` devDep + `npm test` script.                                                           |
| `README.md`                   | Code-map entry, `npm test`, and the generic-tier next-steps note.                              |

### Registry shape

The prototype registry covers the dairy aisle in depth (the hierarchy the
feature is really about) plus a broad spread of the existing
`STORE_BRAND_MAP` keys, with `brandKey` keeping the link to the per-store
own-brand engine. Example:

```
quark (Käse-aisle) ─ brandKey: quark
 └ speisequark            aliases: [spq]
    ├ speisequark-magerstufe   aliases: [spq mager, magerquark, quark magerstufe]
    ├ speisequark-20           aliases: [spq 20, quark 20]
    └ speisequark-40           aliases: [spq 40, quark 40]
joghurt ─ brandKey: joghurt ─ aliases: [yoghurt, yogurt]
 ├ naturjoghurt
 ├ griechischer-joghurt   aliases: [greek yoghurt, griech joghurt]
 ├ joghurt-laktosefrei    aliases: [lactose free yoghurt]
 └ skyr
```

### Verification

- `npm run build` (tsc -b + vite build) — **green**.
- `npm test` — **11/11 pass**.
- `npm run lint` — **no new errors**; the 15 pre-existing errors (strict
  react-hooks rules in SearchBar/Scanner/etc., `prefer-const` in store.ts) are
  untouched. The repo does not currently pass lint at baseline.
- Dev server boots and serves HTTP 200. (The Cloudflare *sync worker* throws in
  this sandbox because it can't reach CF — unrelated to the client changes.)

### Constraint hit: push

The work could **not** be pushed to its own remote branch:
- the git remote (a local proxy) returns **403** for any branch except the
  pre-authorized `claude/great-cerf-nBmWt`;
- the GitHub MCP integration is **read-only** (create_branch → 403 "Resource
  not accessible by integration").

So everything sits on the **local** branch `claude/generic-tier-prototype`
(commit `889a8e8`). Options pending a decision: push to the authorized
`claude/great-cerf-nBmWt` (currently even with `main`, so still isolated from
it), or keep local-only.

---

## 4. Next steps

1. Route brand suggestions through `brandKeyForGeneric(item.genericId)` so
   variants inherit own-brands even when the literal name doesn't substring-match
   (unifies representation #2, `store-brands.ts`).
2. Finish collapsing the three "generic" representations into `generics.ts`;
   make `catalog.ts` generics reference a `genericId` rather than duplicate.
3. Add per-SKU attributes — bio/Demeter, Haltungsform (1–4), rating, pack size —
   and make them filterable facets.
4. Introduce the time-bounded `Offer` entity (synced server table, worker-refreshed)
   to power "match offers".
5. Backfill the long tail: extend `scripts/build-catalog.mjs` to assign a
   `genericId` to snapshot rows so OFF products group too.
