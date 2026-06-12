import type { Product } from './types';
import { CATALOG } from './data';

/**
 * Curated German staples — drugstore items where Open Food Facts coverage is thin,
 * plus common branded products that users frequently type by brand name (Nutella,
 * Tempo, Haribo…). Items here always rank above Open Food Facts results in
 * suggestions and remain available offline / when Open Food Facts rate-limits us.
 */
export const CURATED_CATALOG: Product[] = CATALOG;

const norm = (s: string): string =>
  s.toLowerCase()
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const CATALOG_BY_ID: Map<string, Product> = new Map(CURATED_CATALOG.map((p) => [p.id, p]));

/** Look up an icon name from the catalog by productId. Used as a fallback for
 *  items added before per-item icons were assigned, so existing IndexedDB rows
 *  still render with the right icon on next load. */
export function catalogIconFor(productId: string): string | undefined {
  return CATALOG_BY_ID.get(productId)?.icon;
}

export function searchCatalog(query: string, limit = 8): Product[] {
  if (!query.trim()) return [];
  const qNorm = norm(query);
  const qTokens = qNorm.split(' ').filter(Boolean);
  if (!qTokens.length) return [];
  const qJoined = qTokens.join('');

  const exact: Product[] = [];
  const prefix: Product[] = [];
  const allTokens: Product[] = [];
  const contains: Product[] = [];

  for (const p of CURATED_CATALOG) {
    const n = norm(p.name);
    const nJoined = n.replace(/ /g, '');
    if (n === qNorm || nJoined === qJoined) {
      exact.push(p);
    } else if (n.startsWith(qNorm) || nJoined.startsWith(qJoined)) {
      prefix.push(p);
    } else if (qTokens.every((t) => n.split(' ').some((w) => w.startsWith(t)))) {
      // Word-prefix per token — fragments never match mid- or end-of-word.
      allTokens.push(p);
    } else if (qJoined.length >= 5 && nJoined.includes(qJoined)) {
      // German-compound exception: a substantial fragment may sit inside a
      // Kompositum ("rostbra" in "lupinenrostbratwuerstchen"). Length-gated
      // so "la" can't match word-middles.
      contains.push(p);
    }
  }
  return [...exact, ...prefix, ...allTokens, ...contains].slice(0, limit);
}
