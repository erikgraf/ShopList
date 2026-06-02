/**
 * Guard: `data/categories.csv` + `data/legacy-categories.csv` must stay in
 * lock-step with the TS category tables. The 14-row category set is the one
 * piece of hand-maintained data NOT loaded from CSV at runtime — it's coupled
 * to the `Category` union type in types.ts — so the CSV is a mirror. This test
 * fails if the two drift, keeping the mirror trustworthy for the diagrams/docs.
 *
 * (Only the type-sourced columns are checked here — label/order/kind/stores/
 * legacy. The icon/colour/glyph columns mirror `icons.tsx`; importing that
 * pulls the React+Dexie chain into the node test env, so they're left as a
 * reference snapshot validated by eye in the #icons gallery.)
 */
import { test, expect } from 'vitest';
import categoriesCsv from '../../data/categories.csv?raw';
import legacyCsv from '../../data/legacy-categories.csv?raw';
import { parseCSV } from './index';
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  CATEGORY_KIND,
  LEGACY_CATEGORY_MAP,
  type Category,
} from '../types';
import { defaultStoresForCategory } from '../openfoodfacts';

test('categories.csv matches the TS category tables', () => {
  const rows = parseCSV(categoriesCsv);
  expect(rows.length).toBe(CATEGORY_ORDER.length);
  for (const r of rows) {
    const slug = r.slug as Category;
    expect(CATEGORY_LABELS[slug]).toBe(r.label);
    expect(CATEGORY_ORDER.indexOf(slug) + 1).toBe(Number(r.order));
    expect(CATEGORY_KIND[slug]).toBe(r.kind);
    expect(defaultStoresForCategory(slug).join('|')).toBe(r.defaultStores);
  }
});

test('legacy-categories.csv matches LEGACY_CATEGORY_MAP', () => {
  const fromCsv = Object.fromEntries(parseCSV(legacyCsv).map((r) => [r.old, r.new]));
  expect(fromCsv).toEqual(LEGACY_CATEGORY_MAP);
});
