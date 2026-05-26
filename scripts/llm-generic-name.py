#!/usr/bin/env python3
"""
LLM generic-product-name pass (Opus 4.7) for quality comparison vs the regex
`product_type` column.

Two stages:

  python3 scripts/llm-generic-name.py sample [N]
      Build a stratified sample of ~N products (default 300) from
      data/off-de-full.csv → data/llm-sample-input.csv

  python3 scripts/llm-generic-name.py run [--batch 30]
      Read the sample, batch it, ask Opus (via the local `claude` CLI) for a
      head-noun-first "generic product name" per product, and write
      data/llm-sample-comparison.csv with the regex product_type beside the
      Opus column. Resumable: cached answers live in data/.llm-cache.jsonl

  python3 scripts/llm-generic-name.py full [--batch 50] [--workers 4]
      Label the entire catalog (data/off-de-full.csv) in parallel and persist
      data/llm-generic-names.csv keyed by `code`. Resumable; only fetches codes
      not already in the cache.

  python3 scripts/llm-generic-name.py join
      Patch public/off-de-snapshot.csv with a `generic` column from
      data/llm-generic-names.csv (by code) so the app loads the LLM names.
      Refresh order: `npm run build:catalog` → `full` → `join`.

The "generic product name" target (per the working hypothesis):
  head noun first, qualifiers trailing, lowercase qualifiers, specific enough
  to find offers/alternatives across brands but with no brand / size / fat-% /
  marketing fluff. Examples: "Weizenbier alkoholfrei", "Joghurt griechisch
  laktosefrei", "Bratwurst vegan".
"""
import concurrent.futures as cf
import csv
import json
import random
import subprocess
import sys
import threading
import time
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).parent.parent
FULL_CSV     = ROOT / "data" / "off-de-full.csv"
SNAPSHOT_CSV = ROOT / "public" / "off-de-snapshot.csv"  # shipped, loaded by snapshot.ts
SAMPLE_CSV   = ROOT / "data" / "llm-sample-input.csv"
COMPARE_CSV  = ROOT / "data" / "llm-sample-comparison.csv"
LABELS_CSV   = ROOT / "data" / "llm-generic-names.csv"  # gold-standard, keyed by code
CACHE_PATH   = ROOT / "data" / ".llm-cache.jsonl"       # append-only working log

SEED = 42

# Fields carried into the sample (LLM signal + regex columns for comparison)
SAMPLE_FIELDS = [
    "code", "name", "generic_name", "brand", "off_categories", "labels",
    "quantity", "category", "generic_name_clean", "product_type",
]


# ─────────────────────────────────────────────────────────────
# Stage 1 — stratified sample
# ─────────────────────────────────────────────────────────────

def build_sample(target: int) -> None:
    with open(FULL_CSV, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    rng = random.Random(SEED)

    # Group by category (ShopList slug)
    by_cat: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        by_cat[r.get("category") or "(blank)"].append(r)

    # Per-category quota: blend equal + proportional so small categories are
    # represented but big ones still dominate. Then cap so no single category
    # eats the sample.
    total = len(rows)
    n_cats = len(by_cat)
    quotas: dict[str, int] = {}
    for cat, group in by_cat.items():
        prop = len(group) / total
        equal = 1 / n_cats
        weight = 0.5 * prop + 0.5 * equal
        quotas[cat] = max(6, round(weight * target))

    picked: list[dict] = []
    for cat, group in by_cat.items():
        quota = min(quotas[cat], len(group))
        picked.extend(_diverse_pick(group, quota, rng))

    # Trim/pad toward target deterministically
    rng.shuffle(picked)
    picked = picked[:target]
    picked.sort(key=lambda r: (r.get("category") or "", r.get("generic_name_clean") or "", r.get("name") or ""))

    with open(SAMPLE_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=SAMPLE_FIELDS, extrasaction="ignore", lineterminator="\n")
        w.writeheader()
        w.writerows(picked)

    # Report distribution
    from collections import Counter
    cat_dist = Counter(r.get("category") or "(blank)" for r in picked)
    with_label = sum(1 for r in picked if (r.get("labels") or "").strip())
    with_gen   = sum(1 for r in picked if (r.get("generic_name") or "").strip())
    refined    = sum(1 for r in picked if r.get("product_type") and r.get("product_type") != r.get("generic_name_clean"))
    print(f"Wrote {len(picked)} sampled products → {SAMPLE_CSV}")
    print(f"  distinct generic_name_clean: {len({r.get('generic_name_clean') for r in picked})}")
    print(f"  with OFF generic_name:       {with_gen}")
    print(f"  with labels:                 {with_label}")
    print(f"  regex product_type refined:  {refined}")
    print("  category spread:")
    for cat, n in cat_dist.most_common():
        print(f"    {cat:22s} {n}")


def _diverse_pick(group: list[dict], quota: int, rng: random.Random) -> list[dict]:
    """Pick `quota` rows from one category maximizing generic_name_clean variety,
    biasing toward rows that carry signal (generic_name or dietary labels)."""
    # Bucket by broad type
    by_type: dict[str, list[dict]] = defaultdict(list)
    for r in group:
        by_type[r.get("generic_name_clean") or ""].append(r)

    # Within each type, richer rows first (has generic_name, has labels)
    def richness(r: dict) -> tuple:
        return (
            1 if (r.get("generic_name") or "").strip() else 0,
            1 if (r.get("labels") or "").strip() else 0,
            rng.random(),
        )
    for t in by_type:
        by_type[t].sort(key=richness, reverse=True)

    # Round-robin across types so we don't take 40 yogurts
    types = list(by_type.keys())
    rng.shuffle(types)
    out: list[dict] = []
    idx = 0
    while len(out) < quota and any(by_type.values()):
        t = types[idx % len(types)]
        if by_type[t]:
            out.append(by_type[t].pop(0))
        idx += 1
        if idx > quota * 50:  # safety
            break
    return out


# ─────────────────────────────────────────────────────────────
# Stage 2 — Opus pass via the `claude` CLI
# ─────────────────────────────────────────────────────────────

PROMPT_HEADER = """\
You normalize German grocery products into a "generic product name" — the name a \
shopper would use to find the SAME product across different brands and stores \
(for price comparison and alternatives).

Rules for the generic product name:
- HEAD NOUN FIRST, qualifiers trailing and lowercase. Group variants under the base noun.
  Examples: "Weizenbier alkoholfrei", "Joghurt griechisch laktosefrei", "Bratwurst vegan",
  "Milch laktosefrei", "Hähnchenbrust", "Olivenöl nativ extra", "Haferdrink".
- Keep ONLY distinguishing attributes that matter for finding the same product across brands:
  type/style (griechisch, Weizen, Vollkorn, nativ), dietary (alkoholfrei, laktosefrei,
  vegan, glutenfrei), and defining flavor when it IS the product line (e.g. "Fruchtjoghurt"
  or "Joghurt Erdbeere"). Use German.
- DROP: brand names, package size/count, fat-% numbers, marketing words (z.B. "fein",
  "cremig", "Der große", "Original", "de luxe"), and OFF boilerplate.
- Prefer a real, idiomatic German grocery term. 2–5 words. No trailing punctuation.
- If the product is non-food / unclear, still give the best generic noun you can.

Return ONLY a JSON object mapping each product "code" to its generic product name, e.g.:
{"4011200296908":"Weizenbier alkoholfrei","420......":"Joghurt griechisch"}
No prose, no code fences — just the JSON object.

Products:
"""


def _trim_tags(tags: str, keep: int = 6) -> str:
    parts = [t for t in (tags or "").split("|") if t]
    return "|".join(parts[-keep:])


def _build_prompt(batch: list[dict]) -> str:
    items = []
    for r in batch:
        items.append({
            "code": r["code"],
            "name": r.get("name", ""),
            "off_generic": r.get("generic_name", ""),
            "brand": r.get("brand", ""),
            "categories": _trim_tags(r.get("off_categories", "")),
            "labels": _trim_tags(r.get("labels", ""), keep=5),
        })
    return PROMPT_HEADER + json.dumps(items, ensure_ascii=False, indent=0)


def _call_claude(prompt: str, model: str = "opus") -> str:
    proc = subprocess.run(
        ["claude", "-p", prompt, "--model", model],
        capture_output=True, text=True, timeout=600,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"claude CLI failed (rc={proc.returncode}): {proc.stderr[:500]}")
    return proc.stdout.strip()


def _extract_json(text: str) -> dict:
    """Pull the first {...} JSON object out of the model output."""
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1 or end <= start:
        raise ValueError(f"no JSON object in output: {text[:200]!r}")
    return json.loads(text[start:end + 1])


def _load_cache() -> dict[str, str]:
    cache: dict[str, str] = {}
    if CACHE_PATH.exists():
        for line in CACHE_PATH.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            cache[obj["code"]] = obj["name"]
    return cache


def _append_cache(mapping: dict[str, str]) -> None:
    with open(CACHE_PATH, "a", encoding="utf-8") as f:
        for code, name in mapping.items():
            f.write(json.dumps({"code": code, "name": name}, ensure_ascii=False) + "\n")


def run(batch_size: int, model: str) -> None:
    with open(SAMPLE_CSV, newline="", encoding="utf-8") as f:
        sample = list(csv.DictReader(f))

    cache = _load_cache()
    todo = [r for r in sample if r["code"] not in cache]
    print(f"{len(sample)} sampled, {len(cache)} cached, {len(todo)} to fetch "
          f"({(len(todo)+batch_size-1)//batch_size} batches of {batch_size})")

    for i in range(0, len(todo), batch_size):
        batch = todo[i:i + batch_size]
        bn = i // batch_size + 1
        print(f"  batch {bn}: {len(batch)} products …", flush=True)
        prompt = _build_prompt(batch)
        out = _call_claude(prompt, model=model)
        try:
            mapping = _extract_json(out)
        except (ValueError, json.JSONDecodeError) as e:
            print(f"    ! parse error: {e}; retrying once", flush=True)
            out = _call_claude(prompt, model=model)
            mapping = _extract_json(out)
        # keep only codes we asked for
        codes = {r["code"] for r in batch}
        mapping = {k: v.strip() for k, v in mapping.items() if k in codes}
        _append_cache(mapping)
        cache.update(mapping)
        got = len(mapping)
        print(f"    got {got}/{len(batch)}", flush=True)

    # Write comparison CSV
    out_fields = [
        "code", "name", "brand", "category",
        "generic_name_clean", "product_type", "generic_product_llm",
        "generic_name", "off_categories", "labels",
    ]
    with open(COMPARE_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=out_fields, extrasaction="ignore", lineterminator="\n")
        w.writeheader()
        for r in sample:
            r = dict(r)
            r["generic_product_llm"] = cache.get(r["code"], "")
            w.writerow(r)

    # Quick agreement stats
    n = len(sample)
    have = sum(1 for r in sample if cache.get(r["code"]))
    same_as_type = sum(1 for r in sample
                       if cache.get(r["code"], "").lower() == (r.get("product_type") or "").lower())
    same_as_broad = sum(1 for r in sample
                        if cache.get(r["code"], "").lower() == (r.get("generic_name_clean") or "").lower())
    print(f"\nWrote {n} rows → {COMPARE_CSV}")
    print(f"  LLM answered:                 {have}/{n}")
    print(f"  LLM == regex product_type:    {same_as_type} ({100*same_as_type//n}%)")
    print(f"  LLM == broad generic category:{same_as_broad} ({100*same_as_broad//n}%)")
    print(f"  → {n - same_as_type} rows differ from the regex column (the interesting ones)")


# ─────────────────────────────────────────────────────────────
# Stage 3 — full catalog pass (parallel, resumable)
# ─────────────────────────────────────────────────────────────
# The full 19k labels are the "gold standard" we persist keyed by product
# `code` in data/llm-generic-names.csv. That file is independent of the
# git-ignored, regenerable data/off-de-full.csv — so `npm run build:catalog`
# can refresh the analysis export without wiping the labels, and a later
# `full` run only pays for codes it hasn't labeled yet.

def _fetch_batch(batch: list[dict], model: str, attempts: int = 3) -> dict[str, str]:
    """Call Opus for one batch with retry/backoff; return {code: name} for asked codes."""
    prompt = _build_prompt(batch)
    codes = {r["code"] for r in batch}
    delay, last = 5, None
    for i in range(attempts):
        try:
            mapping = _extract_json(_call_claude(prompt, model=model))
            return {k: v.strip() for k, v in mapping.items()
                    if k in codes and isinstance(v, str) and v.strip()}
        except Exception as e:  # noqa: BLE001 — subprocess/parse/timeout all retryable
            last = e
            if i < attempts - 1:
                time.sleep(delay)
                delay *= 3
    raise RuntimeError(f"batch failed after {attempts} attempts: {last}")


def run_full(batch_size: int, model: str, workers: int) -> None:
    with open(FULL_CSV, newline="", encoding="utf-8") as f:
        rows = [r for r in csv.DictReader(f) if (r.get("code") or "").strip()]

    cache = _load_cache()
    lock = threading.Lock()
    counter = {"done": 0}

    def drain(todo: list[dict], label: str) -> None:
        batches = [todo[i:i + batch_size] for i in range(0, len(todo), batch_size)]
        if not batches:
            return
        counter["done"] = 0
        print(f"  {label}: {len(todo)} products in {len(batches)} batches "
              f"({workers} workers)", flush=True)
        with cf.ThreadPoolExecutor(max_workers=workers) as ex:
            futs = {ex.submit(_fetch_batch, b, model): b for b in batches}
            for fut in cf.as_completed(futs):
                try:
                    mapping = fut.result()
                except Exception as e:  # noqa: BLE001
                    print(f"    ! batch dropped: {e}", flush=True)
                    mapping = {}
                with lock:
                    if mapping:
                        _append_cache(mapping)
                        cache.update(mapping)
                    counter["done"] += 1
                    if counter["done"] % 10 == 0 or counter["done"] == len(batches):
                        print(f"    [{counter['done']}/{len(batches)}] "
                              f"cache={len(cache)}", flush=True)

    todo = [r for r in rows if r["code"] not in cache]
    print(f"{len(rows)} products, {len(cache)} already cached, {len(todo)} to fetch", flush=True)

    drain(todo, "main pass")
    # Mop-up rounds for codes dropped by oversized/failed batches
    for rnd in range(1, 4):
        missing = [r for r in rows if r["code"] not in cache]
        if not missing:
            break
        drain(missing, f"mop-up {rnd}")

    # Persist gold-standard labels keyed by code
    n_lab = 0
    with open(LABELS_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["code", "name", "generic_product_llm", "model"], lineterminator="\n")
        w.writeheader()
        for r in rows:
            lab = cache.get(r["code"], "")
            if lab:
                n_lab += 1
            w.writerow({"code": r["code"], "name": r.get("name", ""),
                        "generic_product_llm": lab, "model": model if lab else ""})

    miss = len(rows) - n_lab
    print(f"\nWrote {LABELS_CSV}")
    print(f"  labeled {n_lab}/{len(rows)} ({100*n_lab//len(rows)}%)"
          + (f", {miss} still missing — re-run `full` to mop up" if miss else " — complete"))


# ─────────────────────────────────────────────────────────────
# Stage 4 — join labels into the shipped runtime snapshot
# ─────────────────────────────────────────────────────────────
# build-catalog.mjs stays a pure OFF→CSV transform; this step stitches the
# generic product name onto the lean snapshot the app actually loads. Keyed by
# `code`, so it's safe to re-run after re-labeling without a full rebuild.
# Refresh order: build:catalog → `full` → `join`.

def join_snapshot() -> None:
    if not SNAPSHOT_CSV.exists():
        print(f"! {SNAPSHOT_CSV} not found — run `npm run build:catalog` first")
        return
    if not LABELS_CSV.exists():
        print(f"! {LABELS_CSV} not found — run `full` first")
        return

    with open(LABELS_CSV, newline="", encoding="utf-8") as f:
        labels = {r["code"]: r["generic_product_llm"] for r in csv.DictReader(f)}

    with open(SNAPSHOT_CSV, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fields = list(reader.fieldnames or [])
        rows = list(reader)

    if "generic" not in fields:
        fields.append("generic")

    hits = 0
    for r in rows:
        g = labels.get(r.get("code", ""), "")
        r["generic"] = g
        if g:
            hits += 1

    with open(SNAPSHOT_CSV, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore", lineterminator="\n")
        w.writeheader()
        w.writerows(rows)

    n = len(rows)
    print(f"Patched {SNAPSHOT_CSV}")
    print(f"  {hits}/{n} rows got a generic name ({100*hits//n if n else 0}%)")
    miss = n - hits
    if miss:
        print(f"  {miss} rows unlabeled (codes not in {LABELS_CSV.name})")


def _opt(args: list[str], flag: str, default):
    return type(default)(args[args.index(flag) + 1]) if flag in args else default


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args or args[0] not in ("sample", "run", "full", "join"):
        print(__doc__)
        sys.exit(1)

    if args[0] == "sample":
        target = int(args[1]) if len(args) > 1 and args[1].isdigit() else 300
        build_sample(target)
    elif args[0] == "run":
        run(_opt(args, "--batch", 30), _opt(args, "--model", "opus"))
    elif args[0] == "join":
        join_snapshot()
    else:  # full
        run_full(_opt(args, "--batch", 50),
                 _opt(args, "--model", "opus"),
                 _opt(args, "--workers", 4))
