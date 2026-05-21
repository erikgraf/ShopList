import { useEffect, useState } from 'react';
import { db, emitChange, onChange } from './db';
import { defaultStoresForCategory } from './openfoodfacts';
import { DEFAULT_LIST_ID, type Item, type Product, type RecentProduct, type ShopList } from './types';

const ACTIVE_LIST_KEY = 'shoplist.activeListId';

export function getActiveListId(): string {
  return localStorage.getItem(ACTIVE_LIST_KEY) ?? DEFAULT_LIST_ID;
}

export function setActiveListId(id: string): void {
  localStorage.setItem(ACTIVE_LIST_KEY, id);
  emitChange();
}

export async function createList(name: string): Promise<ShopList> {
  const all = await db.lists.toArray();
  const max = all.reduce((m, l) => Math.max(m, l.position), -1);
  const list: ShopList = {
    id: uid(),
    name: name.trim() || 'Neue Liste',
    createdAt: Date.now(),
    position: max + 1,
  };
  await db.lists.put(list);
  setActiveListId(list.id);
  return list;
}

export async function renameList(id: string, name: string): Promise<void> {
  await db.lists.update(id, { name: name.trim() });
  emitChange();
}

export async function deleteList(id: string): Promise<void> {
  if (id === DEFAULT_LIST_ID) return; // protect the default list
  const items = await db.items.where('listId').equals(id).primaryKeys();
  await db.items.bulkDelete(items as string[]);
  await db.lists.delete(id);
  if (getActiveListId() === id) setActiveListId(DEFAULT_LIST_ID);
  emitChange();
}

export function useLists(): ShopList[] {
  const [lists, setLists] = useState<ShopList[]>([]);
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const all = await db.lists.toArray();
      all.sort((a, b) => a.position - b.position || a.createdAt - b.createdAt);
      if (alive) setLists(all);
    };
    refresh();
    return onChange(refresh);
  }, []);
  return lists;
}

export function useActiveListId(): string {
  const [id, setId] = useState<string>(() => getActiveListId());
  useEffect(() => {
    const refresh = () => setId(getActiveListId());
    refresh();
    return onChange(refresh);
  }, []);
  return id;
}

function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function addItemFromProduct(p: Product, quantity = 1): Promise<Item> {
  const activeList = getActiveListId();
  const all = await db.items.where('listId').equals(activeList).toArray();
  const open = all.filter((it) => !it.checked);
  const max = all.reduce((m, it) => Math.max(m, it.position), -1);
  const stores = p.stores && p.stores.length ? p.stores : defaultStoresForCategory(p.category);

  const dup = open.find(
    (it) =>
      it.productId === p.id ||
      (it.name.toLowerCase() === p.name.toLowerCase() &&
        (it.brand ?? '').toLowerCase() === (p.brand ?? '').toLowerCase()),
  );
  if (dup) {
    const next = { ...dup, quantity: dup.quantity + quantity };
    await db.items.put(next);
    await bumpRecent(p);
    emitChange();
    return next;
  }

  const item: Item = {
    id: uid(),
    listId: activeList,
    productId: p.id,
    name: p.name,
    brand: p.brand,
    image: p.image,
    category: p.category,
    barcode: p.barcode,
    stores,
    quantity,
    unit: 'Stk',
    checked: false,
    addedAt: Date.now(),
    position: max + 1,
    icon: p.icon,
    sizes: p.sizes,
  };
  await db.items.put(item);
  await bumpRecent(p);
  emitChange();
  return item;
}

async function bumpRecent(p: Product): Promise<void> {
  const existing = await db.recent.get(p.id);
  const next: RecentProduct = {
    ...p,
    lastUsedAt: Date.now(),
    useCount: (existing?.useCount ?? 0) + 1,
  };
  await db.recent.put(next);
}

export async function updateQuantity(id: string, delta: number): Promise<void> {
  const it = await db.items.get(id);
  if (!it) return;
  const q = Math.max(1, it.quantity + delta);
  await db.items.update(id, { quantity: q });
  emitChange();
}

export async function setQuantity(id: string, value: number): Promise<void> {
  const it = await db.items.get(id);
  if (!it) return;
  const q = Math.max(1, Math.min(999, Math.round(value)));
  await db.items.update(id, { quantity: q });
  emitChange();
}

export async function setBrand(id: string, brand: string | null): Promise<void> {
  const it = await db.items.get(id);
  if (!it) return;
  await db.items.update(id, { brand: brand ?? undefined });
  emitChange();
}

export async function toggleChecked(id: string): Promise<void> {
  const it = await db.items.get(id);
  if (!it) return;
  await db.items.update(id, { checked: !it.checked });
  emitChange();
}

export async function deleteItem(id: string): Promise<void> {
  await db.items.delete(id);
  emitChange();
}

export async function clearChecked(): Promise<void> {
  const activeList = getActiveListId();
  const all = await db.items.where('listId').equals(activeList).toArray();
  const ids = all.filter((it) => it.checked).map((it) => it.id);
  await db.items.bulkDelete(ids);
  emitChange();
}

export async function getRecent(limit = 12): Promise<RecentProduct[]> {
  return db.recent.orderBy('lastUsedAt').reverse().limit(limit).toArray();
}

export function useItems(): Item[] {
  const [items, setItems] = useState<Item[]>([]);
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const activeList = getActiveListId();
      const all = await db.items.where('listId').equals(activeList).toArray();
      if (!alive) return;
      all.sort(
        (a, b) =>
          Number(a.checked) - Number(b.checked) ||
          a.position - b.position ||
          a.addedAt - b.addedAt,
      );
      setItems(all);
    };
    refresh();
    return onChange(refresh);
  }, []);
  return items;
}

export function useRecent(): RecentProduct[] {
  const [recent, setRecent] = useState<RecentProduct[]>([]);
  useEffect(() => {
    let alive = true;
    const refresh = async () => {
      const r = await getRecent();
      if (alive) setRecent(r);
    };
    refresh();
    return onChange(refresh);
  }, []);
  return recent;
}
