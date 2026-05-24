import { useEffect, useState } from 'react';
import { db } from './db';
import { hasIcon } from './icons-library';
import { catalogIconFor } from './catalog';
import { CATEGORY_LABELS, type Category, type Item, type UnknownBarcode } from './types';
import { ProductImage } from './icons';

/**
 * Dev gap-finder, mounted on `location.hash === '#unknowns'`. Surfaces the
 * catalog/icon gaps automatically instead of spotting them by eye:
 *
 *  1. Items currently on any list that fall back to a generic category icon
 *     (no dedicated icon for the name) — e.g. a Shiitake added from Open
 *     Food Facts before it was catalogued. These are catalog/icon to-dos.
 *  2. Barcodes that missed every OFF sister-DB (logged in unknownBarcodes).
 *
 * Unlinked from the app; reachable by typing the hash on any device.
 */
export function GapFinder() {
  const [items, setItems] = useState<Item[]>([]);
  const [barcodes, setBarcodes] = useState<UnknownBarcode[]>([]);

  useEffect(() => {
    void db.items.toArray().then(setItems);
    void db.unknownBarcodes
      .orderBy('lastSeenAt')
      .reverse()
      .toArray()
      .then(setBarcodes)
      .catch(() => setBarcodes([]));
  }, []);

  // Dedupe gap items by name; a "gap" is any live item whose resolved icon
  // isn't a real dedicated icon (so it renders the category default).
  const gapMap = new Map<string, { name: string; category: Category; count: number }>();
  for (const it of items) {
    if (it.deletedAt) continue;
    const resolved = it.icon ?? (it.productId ? catalogIconFor(it.productId) : undefined);
    if (resolved && hasIcon(resolved)) continue;
    const key = it.name.toLowerCase();
    const ex = gapMap.get(key);
    if (ex) ex.count += 1;
    else gapMap.set(key, { name: it.name, category: it.category, count: 1 });
  }
  const gaps = [...gapMap.values()].sort((a, b) => b.count - a.count);

  return (
    <div
      style={{
        maxWidth: 720,
        margin: '0 auto',
        padding: '24px 16px 80px',
        fontFamily: 'system-ui, sans-serif',
        color: '#2d2a24',
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Catalog gaps</h1>
      <p style={{ fontSize: 13, color: '#6b6557', marginTop: 6 }}>
        Items on your lists with no dedicated icon (they fall back to the category default), plus
        scanned barcodes that matched no Open Food Facts database. A ready-made to-do list of
        catalog/icon gaps.
      </p>

      <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 28 }}>
        Generic-icon items <span style={{ opacity: 0.5, fontWeight: 400 }}>({gaps.length})</span>
      </h2>
      {gaps.length === 0 ? (
        <p style={{ fontSize: 13, color: '#6b6557' }}>None — every item on your lists has a dedicated icon.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0' }}>
          {gaps.map((g) => (
            <li
              key={g.name}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 10px',
                borderBottom: '1px solid #eee7da',
              }}
            >
              <ProductImage category={g.category} size={36} />
              <span style={{ flex: 1, fontSize: 14 }}>{g.name}</span>
              <span style={{ fontSize: 12, color: '#6b6557' }}>{CATEGORY_LABELS[g.category]}</span>
              {g.count > 1 && (
                <span style={{ fontSize: 11, color: '#9a8f78' }}>×{g.count}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 style={{ fontSize: 15, fontWeight: 600, marginTop: 28 }}>
        Unknown barcodes <span style={{ opacity: 0.5, fontWeight: 400 }}>({barcodes.length})</span>
      </h2>
      {barcodes.length === 0 ? (
        <p style={{ fontSize: 13, color: '#6b6557' }}>None logged yet.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0 0' }}>
          {barcodes.map((b) => (
            <li
              key={b.barcode}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '8px 10px',
                borderBottom: '1px solid #eee7da',
                fontSize: 13,
              }}
            >
              <code style={{ flex: 1 }}>{b.barcode}</code>
              {b.userName && <span style={{ color: '#6b6557' }}>{b.userName}</span>}
              <span style={{ fontSize: 11, color: '#9a8f78' }}>×{b.count}</span>
              <span style={{ fontSize: 11, color: '#9a8f78' }}>
                {new Date(b.lastSeenAt).toLocaleDateString('de-DE')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
