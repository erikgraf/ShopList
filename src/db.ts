import Dexie, { type Table } from 'dexie';
import { migrateCategory, type Item, type RecentProduct } from './types';

class ShopListDB extends Dexie {
  items!: Table<Item, string>;
  recent!: Table<RecentProduct, string>;

  constructor() {
    super('shoplist');
    this.version(1).stores({
      items: 'id, position, addedAt',
      recent: 'id, lastUsedAt, useCount',
    });
    // v2: 14-category revamp. Remap legacy categories on existing items
    // (`milch` → `milch-eier`, `trocken` → `vorrat`, etc.) so users coming
    // back to the app see their list under the new headers.
    this.version(2)
      .stores({
        items: 'id, position, addedAt',
        recent: 'id, lastUsedAt, useCount',
      })
      .upgrade(async (tx) => {
        await tx
          .table('items')
          .toCollection()
          .modify((row) => {
            row.category = migrateCategory(row.category);
          });
        await tx
          .table('recent')
          .toCollection()
          .modify((row) => {
            row.category = migrateCategory(row.category);
          });
      });
  }
}

export const db = new ShopListDB();

const bus = new EventTarget();
const CHANGE = 'change';
export function emitChange(): void {
  bus.dispatchEvent(new Event(CHANGE));
}
export function onChange(cb: () => void): () => void {
  bus.addEventListener(CHANGE, cb);
  return () => bus.removeEventListener(CHANGE, cb);
}
