# `data/` — the editable lists & mappings

These CSVs are the **human-editable source of truth** for ShopList's curated
data. The app parses them at build time (Vite inlines each file via `?raw`, so
nothing extra ships and there's no runtime fetch). Edit a CSV → reload → done.
No code change, no regeneration step.

Open them in any spreadsheet or text editor. List-valued cells use `|` as the
separator (e.g. `rewe|edeka|aldi|lidl`); fields containing a comma are
double-quoted (e.g. `"Gewürze, Öle & Saucen"`).

| File | Rows | Loaded by | Status |
| --- | --- | --- | --- |
| `catalog.csv` | 396 | `src/data/index.ts` → `CURATED_CATALOG` | **source of truth** |
| `generics.csv` | 68 | `src/data/index.ts` → `GENERICS` | **source of truth** |
| `store-brands.csv` | 64 | `src/data/index.ts` → `STORE_BRAND_MAP` + `KEY_LABELS` | **source of truth** |
| `categories.csv` | 14 | mirror of `types.ts` + `icons.tsx` | mirror (guarded by a test) |
| `legacy-categories.csv` | 12 | mirror of `LEGACY_CATEGORY_MAP` | mirror (guarded by a test) |

> Why are categories a mirror? The 14 categories define the `Category` **union
> type** used across the code, so they live in `types.ts`. `categories.csv` is a
> readable copy kept honest by `src/data/categories.sync.test.ts` — `npm test`
> fails if they drift. (Editing categories means editing `types.ts`/`icons.tsx`,
> then mirroring here — they change rarely.)

## Where the data comes from and how it reaches the app

```mermaid
flowchart TB
  subgraph EDIT["data/ — CSV, hand-editable"]
    CAT["catalog.csv<br/>396 curated products"]
    GEN["generics.csv<br/>68 concepts + variants"]
    SB["store-brands.csv<br/>64 own-brand keys"]
    CATEG["categories.csv<br/>14 categories (mirror)"]
  end

  subgraph OFF["Open Food Facts — external, not hand-edited"]
    LIVE["live API: search + barcode<br/>openfoodfacts.ts"]
    DUMP[("OFF data dump ~12 GB")]
  end

  LOAD["src/data/index.ts<br/>parseCSV (build-time)"]
  CAT --> LOAD
  GEN --> LOAD
  SB --> LOAD
  LOAD --> SYM["CURATED_CATALOG · GENERICS<br/>STORE_BRAND_MAP · KEY_LABELS"]

  CATEG -. "guard test" .-> TMAPS["types.ts / icons.tsx<br/>CATEGORY_* maps"]

  DUMP -- "scripts/build-catalog.mjs<br/>(offline, ~25 min)" --> SNAP["public/off-de-snapshot.json<br/>19k products, 3.3 MB"]

  SYM --> APP["search · list · filters · scan"]
  TMAPS --> APP
  SNAP --> APP
  LIVE --> APP
```

## How a typed/scanned input becomes a list item

Search merges five knowledge sources, ranked; the pick resolves to a category +
per-store brand. Generic resolution happens first so variants group under one
header (e.g. "Quark" over Speisequark 20%/40%).

```mermaid
flowchart LR
  IN["typed text<br/>or barcode scan"]
  IN --> R["1 · recent items (Dexie)"]
  IN --> C["2 · CURATED_CATALOG<br/>catalog.csv"]
  IN --> G["3 · GENERICS<br/>generics.csv · resolveGeneric()"]
  IN --> S["4 · snapshot<br/>off-de-snapshot.json"]
  IN --> L["5 · live OFF API"]
  R --> RANK["ranked + grouped<br/>under root generic"]
  C --> RANK
  G --> RANK
  S --> RANK
  L --> RANK
  RANK --> PICK["pick / add"]
  PICK --> CTG["category =<br/>generic.category,<br/>else mapCategory(OFF tags)"]
  PICK --> BR["per-store brand =<br/>STORE_BRAND_MAP[brandKey]"]
  PICK --> IT["Item (Dexie)"]
```

## Column reference

**catalog.csv** — `id, name, brand, category, icon, stores, sizes`
`category` is a slug from `categories.csv`; `icon` is an `icons-library` name;
`stores`/`sizes` are `|`-lists (`sizes` are numbers, e.g. `1|6|12|24`).

**generics.csv** — `id, name, category, parentId, aliases, icon, brandKey`
`parentId` points at another generic id (variant hierarchy). `aliases` is a
`|`-list of extra search terms (`spq|magerquark`). `icon`/`brandKey` are
inherited from the parent when blank.

**store-brands.csv** — `key, label, default_{aldi,lidl,rewe,edeka,dm,rossmann}, bio_{…}`
`key` is matched as a whole-token alias against item names; `label` is the
display noun. Each `default_*`/`bio_*` cell is that chain's own-brand (blank =
not carried there). Note grocery staples (Eier, Brot, Milch…) intentionally have
**empty `bio_dm`/`bio_rossmann`** — the drugstores don't carry them, and a value
here would surface the item under those store filters.

**categories.csv** — `slug, label, order, kind, defaultIcon, colorFg, colorBg, glyph, defaultStores`
The 14 supermarket-walk categories. `kind` is `grocery`|`drugstore`;
`defaultStores` is the floor every item in the category inherits.

**legacy-categories.csv** — `old, new` — remaps pre-14-category slugs on load.

## The long tail (not in these CSVs)

`public/off-de-snapshot.json` (19k products) and the live OFF API cover
everything the curated lists don't. The snapshot is **generated**, not
hand-edited — rebuild it with `npm run build:catalog` when the OFF category
rules change. Icon SVG paths live in `src/icons-library*.tsx` (they're code, not
tabular data).
