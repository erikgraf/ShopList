import Dexie, { type Table } from 'dexie';
import { availableStores } from './store-brands';
import { defaultStoresForCategory } from './openfoodfacts';
import {
  migrateCategory,
  DEFAULT_LIST_ID,
  DEFAULT_LIST_NAME,
  type Item,
  type RecentProduct,
  type ShopList,
} from './types';

class ShopListDB extends Dexie {
  items!: Table<Item, string>;
  recent!: Table<RecentProduct, string>;
  lists!: Table<ShopList, string>;

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

    // v3: multi-list support. New `lists` table; existing items belong to a
    // default list whose id matches `DEFAULT_LIST_ID`.
    this.version(3)
      .stores({
        items: 'id, position, addedAt, listId',
        recent: 'id, lastUsedAt, useCount',
        lists: 'id, position',
      })
      .upgrade(async (tx) => {
        await tx.table('lists').put({
          id: DEFAULT_LIST_ID,
          name: DEFAULT_LIST_NAME,
          createdAt: Date.now(),
          position: 0,
        });
        await tx
          .table('items')
          .toCollection()
          .modify((row) => {
            if (!row.listId) row.listId = DEFAULT_LIST_ID;
          });
      });

    // v4: prep for shared-list sync. Adds `updatedAt` (last-write timestamp)
    // to items and lists, plus an `updatedAt` index so the sync loop can ask
    // "items changed since I last pulled" efficiently. Existing rows are
    // backfilled from `addedAt` (items) / `createdAt` (lists). No `deletedAt`
    // index — tombstones are rare enough to scan.
    this.version(4)
      .stores({
        items: 'id, position, addedAt, listId, updatedAt',
        recent: 'id, lastUsedAt, useCount',
        lists: 'id, position, updatedAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('items')
          .toCollection()
          .modify((row) => {
            if (typeof row.updatedAt !== 'number') row.updatedAt = row.addedAt ?? Date.now();
          });
        await tx
          .table('lists')
          .toCollection()
          .modify((row) => {
            if (typeof row.updatedAt !== 'number') row.updatedAt = row.createdAt ?? Date.now();
          });
      });

    // v5: broaden `item.stores` to include every chain that sells this
    // generic — items added before this change have whatever narrow set
    // the product blob happened to claim (e.g. Kamill Handcreme came in
    // as `['dm']` only), which hid them when the user filtered to Aldi
    // or Lidl. Schema is identical to v4; this version only runs the
    // backfill.
    this.version(5)
      .stores({
        items: 'id, position, addedAt, listId, updatedAt',
        recent: 'id, lastUsedAt, useCount',
        lists: 'id, position, updatedAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('items')
          .toCollection()
          .modify((row) => {
            const fallback =
              Array.isArray(row.stores) && row.stores.length > 0
                ? row.stores
                : defaultStoresForCategory(row.category);
            row.stores = availableStores(row.name, fallback);
          });
      });

    // v6: fix a bug in the v5 backfill. v5 kept whatever narrow `stores`
    // a row already had as the fallback, which preserved bad add-time
    // data — "Bananen" with stores=['rewe'] stayed narrow because no
    // STORE_BRAND_MAP entry exists under any banana key to broaden it.
    // Now we seed from defaultStoresForCategory (the per-category floor:
    // any grocery item appears at every grocery chain, any drugstore
    // item at both drugstores plus Rewe/Edeka, etc.) and then union in
    // anything extra the row already had. Schema identical to v5.
    this.version(6)
      .stores({
        items: 'id, position, addedAt, listId, updatedAt',
        recent: 'id, lastUsedAt, useCount',
        lists: 'id, position, updatedAt',
      })
      .upgrade(async (tx) => {
        await tx
          .table('items')
          .toCollection()
          .modify((row) => {
            const existing = Array.isArray(row.stores) ? row.stores : [];
            const fallback = Array.from(
              new Set([...defaultStoresForCategory(row.category), ...existing]),
            );
            row.stores = availableStores(row.name, fallback);
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
