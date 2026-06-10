/**
 * offer-match — the managed synonym layer that makes list↔offer matching
 * smart. Both an offer name ("Cherryrispentomaten 200 g", "Mineralwasser
 * Gerolsteiner") and a list-item name ("Tomaten", "Sprudel Lieler") resolve
 * to a single canonical **match key** (`tomaten`, `mineralwasser`); two
 * things match when their keys are equal — even when they share no words.
 *
 * The synonym table is hand-managed in `data/offer-synonyms.csv` (one row per
 * canonical key, `|`-separated surface forms), reviewed at intervals. It's the
 * application-owned taxonomy the user asked for: stable, editable, decoupled
 * from the regenerable OFF/LLM taxonomy.
 */
import { parseCSV } from './csv';
import synonymsCsv from '../data/offer-synonyms.csv?raw';

/** Transliterate + lowercase so the input matches the CSV's written forms
 *  (which use ae/oe/ue/ss). Same convention as offers.stripDiacritics, kept
 *  local to avoid an import cycle. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .normalize('NFD').replace(/[̀-ͯ]/g, '');
}

interface SurfaceForm {
  surface: string;
  key: string;
}

// Flattened (surface → key) list, built once at module load.
const SURFACES: SurfaceForm[] = (() => {
  const out: SurfaceForm[] = [];
  for (const row of parseCSV(synonymsCsv)) {
    const key = row.match_key?.trim();
    if (!key) continue;
    for (const raw of (row.synonyms ?? '').split('|')) {
      const surface = norm(raw.trim());
      if (surface) out.push({ surface, key });
    }
  }
  return out;
})();

/**
 * Resolve a free-form product name to its canonical match key, or null.
 *
 * Scoring biases toward the German head noun (the suffix), so compounds and
 * modifiers resolve correctly without an explicit rule per variant:
 *   - a name TOKEN that equals the surface form          (strongest)
 *   - a token that ENDS WITH the surface form (compound)  e.g. salat·gurke → gurke
 *   - the surface form appearing anywhere in the name     (weakest; ≥5 chars)
 * Longer surface forms outrank shorter ones at the same tier, so
 * "rispentomaten" beats "tomaten" (both → tomaten anyway) and "salat" can't
 * steal "Salatgurke" from "gurke".
 */
const cache = new Map<string, string | null>();

export function resolveMatchKey(name: string): string | null {
  if (!name) return null;
  const cached = cache.get(name);
  if (cached !== undefined) return cached;
  const result = resolveUncached(name);
  cache.set(name, result);
  return result;
}

function resolveUncached(name: string): string | null {
  const n = norm(name);
  const tokens = n.split(/[^a-z0-9]+/).filter(Boolean);
  let bestKey: string | null = null;
  let bestScore = 0;

  for (const { surface, key } of SURFACES) {
    let score = 0;
    if (surface.includes(' ')) {
      // multi-word surface — plain substring
      if (n.includes(surface)) score = surface.length;
    } else if (tokens.includes(surface)) {
      score = surface.length + 100;
    } else if (surface.length >= 4 && tokens.some((t) => t.endsWith(surface))) {
      score = surface.length + 50;
    } else if (surface.length >= 5 && n.includes(surface)) {
      score = surface.length;
    }
    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }
  return bestKey;
}
