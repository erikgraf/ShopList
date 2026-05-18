import Dexie, { type Table } from 'dexie';
import type { Item, RecentProduct } from './types';

class ShopListDB extends Dexie {
  items!: Table<Item, string>;
  recent!: Table<RecentProduct, string>;

  constructor() {
    super('shoplist');
    this.version(1).stores({
      items: 'id, position, addedAt',
      recent: 'id, lastUsedAt, useCount',
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
