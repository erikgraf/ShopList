#!/usr/bin/env python3
"""
Distill a 2-level product-type taxonomy (level-2 + level-3) from the LLM
gold-standard generic names. Per-category Opus pass.

  python3 scripts/llm-taxonomy.py tree [--workers 3]
      For each ShopList category, ask Opus to propose a 2-level tree from the
      most-frequent LLM generic names in that category. Cached per category
      in data/.taxonomy-cache/tree-<cat>.json.

  python3 scripts/llm-taxonomy.py map [--batch 80] [--workers 3]
      For each category, map all distinct LLM names in chunks to a level-3 id
      (or level-2 if no level-3 fits). Resumable; cached in
      data/.taxonomy-cache/map-<cat>.jsonl.

  python3 scripts/llm-taxonomy.py merge
      Combine all trees + mappings into data/taxonomy.csv (nodes) and
      data/taxonomy-map.csv (llm_name → taxonomy_id).

  python3 scripts/llm-taxonomy.py all
      tree → map → merge in one go.

The taxonomy is intended to be stable across OFF dump refreshes; only new LLM
names get mapped (re-run `map` and `merge` after a dump update).
"""
import concurrent.futures as cf
import csv
import json
import re
import subprocess
import sys
import threading
import time
from collections import Counter, defaultdict
from pathlib import Path

ROOT        = Path(__file__).parent.parent
FULL_CSV    = ROOT / "data" / "off-de-full.csv"
LABELS_CSV  = ROOT / "data" / "llm-generic-names.csv"
CACHE_DIR   = ROOT / "data" / ".taxonomy-cache"
TAX_CSV     = ROOT / "data" / "taxonomy.csv"
TAX_MAP_CSV = ROOT / "data" / "taxonomy-map.csv"

# 14 ShopList categories. baby/koerperpflege/haushalt typically have ~0 LLM
# names (food-only snapshot) — we skip the empties at runtime.
CATEGORY_LABELS: dict[str, str] = {
    "obst-gemuese":          "Obst & Gemüse",
    "brot-gebaeck":          "Brot & Gebäck",
    "milch-eier":            "Milchprodukte & Eier",
    "fleisch-fisch":         "Fleisch & Fisch",
    "tiefkuehl":             "Tiefkühl",
    "vorrat":                "Vorrat & Konserven",
    "gewuerze-saucen":       "Gewürze, Öle & Saucen",
    "fruehstueck-aufstrich": "Frühstück & Aufstrich",
    "suesses-knabberei":     "Süßes & Knabberei",
    "getraenke":             "Getränke",
    "koerperpflege":         "Körperpflege",
    "haushalt":              "Haushalt",
    "baby":                  "Baby",
    "sonstiges":             "Sonstiges",
}


# ─────────────────────────────────────────────────────────────
# Input filtering — drop malformed LLM names so they don't pollute the tree
# ─────────────────────────────────────────────────────────────

_BAD_NAME = re.compile(r'["\x00-\x1f]|\d{8,}')

def is_reasonable_name(s: str) -> bool:
    s = s.strip()
    if not (2 <= len(s) <= 60):
        return False
    if _BAD_NAME.search(s):  # stray quote, control char, embedded barcode
        return False
    if not re.search(r"[A-Za-zÄÖÜäöüß]", s):
        return False
    # Reject leading "0 …" / "0% …" patterns from broken upstream CSV escapes
    if re.match(r"^\d+[%\s]", s):
        return False
    return True


def _load_names_per_category() -> dict[str, Counter]:
    """Distinct LLM generic names per ShopList category, with product counts."""
    cat_of: dict[str, str] = {}
    with open(FULL_CSV, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            cat_of[r["code"]] = r["category"]
    names: dict[str, Counter] = defaultdict(Counter)
    with open(LABELS_CSV, newline="", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            g = (r["generic_product_llm"] or "").strip()
            c = cat_of.get(r["code"], "")
            if g and c and is_reasonable_name(g):
                names[c][g] += 1
    return names


# ─────────────────────────────────────────────────────────────
# Opus driver — `claude -p` headless, with retry/backoff
# ─────────────────────────────────────────────────────────────

def _call_claude(prompt: str, model: str = "opus", timeout: int = 600) -> str:
    proc = subprocess.run(
        ["claude", "-p", prompt, "--model", model],
        capture_output=True, text=True, timeout=timeout,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"claude rc={proc.returncode}: {proc.stderr[:400]}")
    return proc.stdout.strip()


def _extract_json(text: str) -> dict:
    s = text.find("{"); e = text.rfind("}")
    if s == -1 or e == -1 or e <= s:
        raise ValueError(f"no JSON object in output: {text[:200]!r}")
    return json.loads(text[s:e + 1])


def _call_with_retry(prompt: str, model: str = "opus", attempts: int = 3) -> dict:
    delay, last = 8, None
    for i in range(attempts):
        try:
            return _extract_json(_call_claude(prompt, model))
        except Exception as e:  # noqa: BLE001
            last = e
            if i < attempts - 1:
                time.sleep(delay); delay *= 3
    raise RuntimeError(f"failed after {attempts}: {last}")


# ─────────────────────────────────────────────────────────────
# Tree pass — propose level-2 + level-3 per category
# ─────────────────────────────────────────────────────────────

TREE_PROMPT = """You build a 2-level product-type taxonomy for the German shopping-list category "{label}" (slug: {slug}). Input is the most-frequent cleaned generic-product names from a German OFF catalog (already brand/size/marketing stripped).

Produce:
- Level-2 nodes (4–15): broad German product types covering this category.
  Examples for Getränke: Bier, Wein, Saft, Limonade, Wasser, Kaffee, Tee, Smoothie, Energy-Drink, Spirituose.
- Level-3 nodes (2–15 per level-2): specific German sub-types that the input names actually justify.
  Examples under Bier: Pils, Weizenbier, Helles, Alkoholfreies Bier, Schwarzbier, Lager, Dunkelbier, Bockbier, IPA, Radler.

Rules:
- Clear German nouns. No brand names. No size or fat-% qualifiers.
- Slug `id`: lowercase ASCII, hyphenated (alkoholfreies-bier, weisse-schokolade, rumpsteak).
- Each level-2's `parent` is "{slug}". Each level-3's `parent` is its level-2 id.
- Optional `aliases`: synonyms / common spellings ("Pilsener", "Pilsbier") — strings.
- Only include sub-types the input justifies — don't invent nodes for things that aren't there.
- Aim for the granularity a shopper would scan a price-comparison app at (Pils, Filet, Hüftsteak, Fruchtjoghurt). Not so coarse that "Bier" is the only node, not so fine that every flavor variant is its own node.

Return ONLY a JSON object, no prose, no code fences:
{{
  "nodes": [
    {{"id": "bier",                 "name": "Bier",                 "parent": "{slug}",     "aliases": []}},
    {{"id": "pils",                 "name": "Pils",                 "parent": "bier",       "aliases": ["Pilsener","Pilsbier"]}},
    {{"id": "alkoholfreies-bier",   "name": "Alkoholfreies Bier",   "parent": "bier",       "aliases": ["Bier alkoholfrei"]}}
  ]
}}

Top input names for this category (name — product count):
{names_block}
"""


def run_tree(categories: list[str], names_per_cat: dict[str, Counter], workers: int) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    todo = [c for c in categories if not (CACHE_DIR / f"tree-{c}.json").exists()]
    print(f"tree pass: {len(todo)}/{len(categories)} categories to build "
          f"({workers} workers)", flush=True)
    if not todo:
        return

    def work(cat: str) -> tuple[str, int]:
        names = names_per_cat[cat]
        top = names.most_common(min(150, len(names)))
        names_block = "\n".join(f"  {n} — {c}" for n, c in top)
        prompt = TREE_PROMPT.format(
            label=CATEGORY_LABELS[cat], slug=cat, names_block=names_block,
        )
        result = _call_with_retry(prompt)
        (CACHE_DIR / f"tree-{cat}.json").write_text(
            json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8",
        )
        return cat, len(result.get("nodes", []))

    with cf.ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(work, c): c for c in todo}
        for fut in cf.as_completed(futs):
            cat = futs[fut]
            try:
                cat, n = fut.result()
                print(f"  ✓ {cat}: {n} nodes", flush=True)
            except Exception as e:  # noqa: BLE001
                print(f"  ! {cat}: {e}", flush=True)


# ─────────────────────────────────────────────────────────────
# Map pass — assign every distinct name to a node id
# ─────────────────────────────────────────────────────────────

MAP_PROMPT = """Map each German generic-product name to a node id from this taxonomy for category "{label}".

Taxonomy nodes — `id | name | parent | aliases`:
{tree_block}

For each input name, return the most specific matching **level-3** id. If a name clearly fits no level-3 (rare), return the closest level-2 id. Don't invent ids that aren't in the taxonomy.

Return ONLY a JSON object mapping name → id, no prose, no code fences. Example:
{{"Pils": "pils", "Bier Pils": "pils", "Bier alkoholfrei": "alkoholfreies-bier", "Weissbier": "weizenbier"}}

Names to map:
{names_list}
"""


def _load_tree(cat: str) -> list[dict]:
    p = CACHE_DIR / f"tree-{cat}.json"
    if not p.exists():
        return []
    return json.loads(p.read_text(encoding="utf-8")).get("nodes", [])


def _load_map(cat: str) -> dict[str, str]:
    p = CACHE_DIR / f"map-{cat}.jsonl"
    out: dict[str, str] = {}
    if p.exists():
        for line in p.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            out[obj["name"]] = obj["id"]
    return out


def _append_map_locked(cat: str, mapping: dict[str, str], lock: threading.Lock) -> None:
    if not mapping:
        return
    lock.acquire()
    try:
        with open(CACHE_DIR / f"map-{cat}.jsonl", "a", encoding="utf-8") as f:
            for n, i in mapping.items():
                f.write(json.dumps({"name": n, "id": i}, ensure_ascii=False) + "\n")
    finally:
        lock.release()


def _tree_block(nodes: list[dict]) -> str:
    """Compact: one node per line, pipe-separated, sorted parent-first for readability."""
    lines = []
    parents = [n for n in nodes if n.get("parent") and not any(c["id"] == n["parent"] for c in nodes)]
    others  = [n for n in nodes if n not in parents]
    for n in parents + others:
        aliases = "|".join(n.get("aliases") or [])
        lines.append(f"  {n['id']} | {n['name']} | {n.get('parent','')} | {aliases}")
    return "\n".join(lines)


def run_map(categories: list[str], names_per_cat: dict[str, Counter],
            batch_size: int, workers: int) -> None:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    for cat in categories:
        tree = _load_tree(cat)
        if not tree:
            print(f"skip {cat}: no tree yet (run `tree` first)", flush=True)
            continue
        cache = _load_map(cat)
        names = sorted(names_per_cat[cat].keys())
        todo = [n for n in names if n not in cache]
        if not todo:
            print(f"  {cat}: complete ({len(cache)}/{len(names)})", flush=True)
            continue

        tree_block = _tree_block(tree)
        batches = [todo[i:i + batch_size] for i in range(0, len(todo), batch_size)]
        print(f"  {cat}: {len(todo)} names in {len(batches)} batches "
              f"({workers} workers)", flush=True)

        lock = threading.Lock()
        counter = {"done": 0}

        def work(batch: list[str]) -> dict[str, str]:
            names_list = "\n".join(f"  - {n}" for n in batch)
            prompt = MAP_PROMPT.format(
                label=CATEGORY_LABELS[cat], tree_block=tree_block,
                names_list=names_list,
            )
            mapping = _call_with_retry(prompt)
            valid_ids = {n["id"] for n in tree}
            asked = set(batch)
            return {
                n: str(i).strip() for n, i in mapping.items()
                if n in asked and isinstance(i, str) and i.strip() in valid_ids
            }

        with cf.ThreadPoolExecutor(max_workers=workers) as ex:
            futs = {ex.submit(work, b): b for b in batches}
            for fut in cf.as_completed(futs):
                try:
                    m = fut.result()
                except Exception as e:  # noqa: BLE001
                    print(f"    ! batch failed: {e}", flush=True)
                    m = {}
                with lock:
                    _append_map_locked(cat, m, threading.Lock())  # inner lock irrelevant
                    cache.update(m)
                    counter["done"] += 1
                    if counter["done"] % 5 == 0 or counter["done"] == len(batches):
                        print(f"    [{counter['done']}/{len(batches)}] "
                              f"cached={len(cache)}/{len(names)}", flush=True)

        # Mop-up rounds
        for rnd in range(1, 4):
            missing = [n for n in names if n not in cache]
            if not missing:
                break
            print(f"  {cat} mop-up {rnd}: {len(missing)} missing", flush=True)
            chunks = [missing[i:i + batch_size] for i in range(0, len(missing), batch_size)]
            for chunk in chunks:
                try:
                    m = work(chunk)
                except Exception as e:  # noqa: BLE001
                    print(f"    ! {e}", flush=True); continue
                _append_map_locked(cat, m, lock)
                cache.update(m)


# ─────────────────────────────────────────────────────────────
# Merge — emit data/taxonomy.csv + data/taxonomy-map.csv
# ─────────────────────────────────────────────────────────────

def merge_all() -> None:
    nodes_out: list[dict] = []
    map_out: list[dict] = []

    for slug in CATEGORY_LABELS:
        for n in _load_tree(slug):
            nodes_out.append({
                "id":       n["id"],
                "name":     n["name"],
                "parent":   n.get("parent", ""),
                "category": slug,
                "aliases":  "|".join(n.get("aliases") or []),
            })
        for name, node_id in _load_map(slug).items():
            map_out.append({"llm_name": name, "taxonomy_id": node_id, "category": slug})

    # Dedup nodes by id (cross-category id collisions: keep first occurrence)
    seen, deduped = set(), []
    for n in nodes_out:
        if n["id"] in seen:
            continue
        seen.add(n["id"])
        deduped.append(n)

    with open(TAX_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["id", "name", "parent", "category", "aliases"],
                           lineterminator="\n")
        w.writeheader(); w.writerows(deduped)
    print(f"wrote {len(deduped)} nodes → {TAX_CSV}")

    with open(TAX_MAP_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["llm_name", "taxonomy_id", "category"],
                           lineterminator="\n")
        w.writeheader(); w.writerows(map_out)
    print(f"wrote {len(map_out)} mappings → {TAX_MAP_CSV}")

    # Summary: level-2 vs level-3 per category
    by_cat: dict[str, dict[str, int]] = defaultdict(lambda: {"l2": 0, "l3": 0})
    for n in deduped:
        if n["parent"] in CATEGORY_LABELS:
            by_cat[n["category"]]["l2"] += 1
        else:
            by_cat[n["category"]]["l3"] += 1
    print("\nstructure:")
    print(f"  {'category':24} {'L2':>4} {'L3':>4}")
    for c, x in sorted(by_cat.items()):
        print(f"  {c:24} {x['l2']:>4} {x['l3']:>4}")


# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────

def _opt(args: list[str], flag: str, default):
    return type(default)(args[args.index(flag) + 1]) if flag in args else default


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args or args[0] not in ("tree", "map", "merge", "all"):
        print(__doc__); sys.exit(1)

    names_per_cat = _load_names_per_category()
    categories = [c for c in CATEGORY_LABELS if names_per_cat.get(c)]
    total = sum(len(v) for v in names_per_cat.values())
    print(f"loaded {total} distinct reasonable names across {len(categories)} "
          f"non-empty categories\n")

    if args[0] in ("tree", "all"):
        run_tree(categories, names_per_cat, _opt(args, "--workers", 3))
    if args[0] in ("map", "all"):
        run_map(categories, names_per_cat,
                _opt(args, "--batch", 80), _opt(args, "--workers", 3))
    if args[0] in ("merge", "all"):
        merge_all()
