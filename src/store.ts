import { useEffect, useState } from 'react';
import { db, emitChange, onChange } from './db';
import { defaultStoresForCategory } from './openfoodfacts';
import { availableStores, DEFAULT_PREFERENCES, genericName, type Preferences } from './store-brands';
import {
  DEFAULT_LIST_ID,
  DEFAULT_LIST_NAME,
  type Item,
  type Product,
  type RecentProduct,
  type ShopList,
  type Store,
} from './types';

const ACTIVE_LIST_KEY = 'shoplist.activeListId';

export function getActiveListId(): string {
  return localStorage.getItem(ACTIVE_LIST_KEY) ?? DEFAULT_LIST_ID;
}

export function setActiveListId(id: string): void {
  localStorage.setItem(ACTIVE_LIST_KEY, id);
  emitChange();
}

export type IconStyle = 'line' | 'doodle';
const ICON_STYLE_KEY = 'shoplist.iconStyle';

export function getIconStyle(): IconStyle {
  return localStorage.getItem(ICON_STYLE_KEY) === 'doodle' ? 'doodle' : 'line';
}

export function setIconStyle(style: IconStyle): void {
  localStorage.setItem(ICON_STYLE_KEY, style);
  emitChange();
}

export function useIconStyle(): IconStyle {
  const [style, setStyle] = useState<IconStyle>(() => getIconStyle());
  useEffect(() => {
    const refresh = () => setStyle(getIconStyle());
    refresh();
    return onChange(refresh);
  }, []);
  return style;
}

const PREFS_KEY = 'shoplist.preferences';

export function getPreferences(): Preferences {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function setPreferences(p: Partial<Preferences>): void {
  const next = { ...getPreferences(), ...p };
  localStorage.setItem(PREFS_KEY, JSON.stringify(next));
  emitChange();
}

export function usePreferences(): Preferences {
  const [p, setP] = useState<Preferences>(() => getPreferences());
  useEffect(() => {
    const refresh = () => setP(getPreferences());
    refresh();
    return onChange(refresh);
  }, []);
  return p;
}

/**
 * Make sure the default list always exists. Called on app start: if a user
 * somehow ends up without one (cleared a partial install, manual DB edits, an
 * older bug), the leftmost wheel slot reappears as "Einkaufsliste" instead of
 * stranding them with only secondary lists.
 */
/**
 * Patch an item and stamp `updatedAt`. Every mutation goes through this so
 * the field is reliable for last-writer-wins merging when the list is shared.
 */
async function touchItem(id: string, patch: Partial<Item>): Promise<void> {
  await db.items.update(id, { ...patch, updatedAt: Date.now() });
}

/** Same as `touchItem` but for `ShopList` rows. */
async function touchList(id: string, patch: Partial<ShopList>): Promise<void> {
  await db.lists.update(id, { ...patch, updatedAt: Date.now() });
}

export async function ensureDefaultList(): Promise<void> {
  const existing = await db.lists.get(DEFAULT_LIST_ID);
  if (existing) return;
  const all = await db.lists.toArray();
  const minPos = all.reduce((m, l) => Math.min(m, l.position), 0);
  const now = Date.now();
  await db.lists.put({
    id: DEFAULT_LIST_ID,
    name: DEFAULT_LIST_NAME,
    createdAt: now,
    updatedAt: now,
    position: all.length > 0 ? minPos - 1 : 0,
  });
  emitChange();
}

export async function createList(name: string): Promise<ShopList> {
  const all = await db.lists.toArray();
  const max = all.reduce((m, l) => Math.max(m, l.position), -1);
  const now = Date.now();
  const list: ShopList = {
    id: uid(),
    name: name.trim() || 'Neue Liste',
    createdAt: now,
    updatedAt: now,
    position: max + 1,
  };
  await db.lists.put(list);
  setActiveListId(list.id);
  return list;
}

export async function renameList(id: string, name: string): Promise<void> {
  await touchList(id, { name: name.trim() });
  emitChange();
}

export async function deleteList(id: string): Promise<void> {
  if (id === DEFAULT_LIST_ID) return; // protect the default list
  // If the list was shared, revoke the cloud copy too. Best effort — local
  // delete proceeds even if the network call fails (we'd rather lose the
  // share record on the server than block the user's delete).
  const list = await db.lists.get(id);
  if (list?.cloud) {
    try {
      await fetch(`/api/sync/${list.cloud.id}`, { method: 'DELETE' });
    } catch {
      // ignore
    }
  }
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

export async function addItemFromProduct(
  p: Product,
  opts: { quantity?: number; pinToStore?: Store } = {},
): Promise<Item> {
  const { quantity = 1, pinToStore } = opts;
  const activeList = getActiveListId();
  const all = await db.items.where('listId').equals(activeList).toArray();
  const open = all.filter((it) => !it.checked);
  const max = all.reduce((m, it) => Math.max(m, it.position), -1);

  // Barcode scans hand us verbose OFF product names like "Kamill Hand- &
  // Nagelcreme classic". Collapse those to a generic noun ("Handcreme") so
  // the row reads cleanly — the brand + product image stay separately on
  // the right of the row to identify which variant it is. Typed/searched
  // items keep their literal name because the user already chose it.
  const displayName = p.barcode ? genericName(p.name) : p.name;

  // Stores the item could be bought at: always seed from the category
  // default (every chain that carries products in this category), then
  // union in whatever the product blob claimed and every chain that has
  // a STORE_BRAND_MAP entry for this generic name. Seeding from the
  // category default — rather than from p.stores — keeps generic items
  // like "Bananen" visible under every grocery filter (Aldi, Lidl, Rewe,
  // Edeka) even when a particular product blob's `stores` field happened
  // to be narrow or empty.
  const baseStores = Array.from(
    new Set([...defaultStoresForCategory(p.category), ...(p.stores ?? [])]),
  );
  const stores = availableStores(displayName, baseStores);

  const dup = open.find(
    (it) =>
      it.productId === p.id ||
      (it.name.toLowerCase() === displayName.toLowerCase() &&
        (it.brand ?? '').toLowerCase() === (p.brand ?? '').toLowerCase()),
  );
  if (dup) {
    const next: Item = {
      ...dup,
      quantity: dup.quantity + quantity,
      updatedAt: Date.now(),
    };
    // If we're at a specific store and the duplicate doesn't yet have a
    // per-store brand recorded for it, pin this brand to that store.
    if (pinToStore && p.brand && !dup.brandByStore?.[pinToStore]) {
      next.brandByStore = { ...(dup.brandByStore ?? {}), [pinToStore]: p.brand };
    }
    await db.items.put(next);
    await bumpRecent(p);
    emitChange();
    return next;
  }

  // When a single store filter is active at add-time, also pin the scanned
  // brand to that store. That way scanning Kamill at DM lights up at DM and
  // switching to Aldi falls back to a suggestion (Lacura) instead of
  // misrepresenting Kamill as the Aldi pick.
  const brandByStore =
    pinToStore && p.brand ? ({ [pinToStore]: p.brand } as Partial<Record<Store, string>>) : undefined;

  const now = Date.now();
  const item: Item = {
    id: uid(),
    listId: activeList,
    productId: p.id,
    name: displayName,
    brand: p.brand,
    brandByStore,
    image: p.image,
    category: p.category,
    barcode: p.barcode,
    stores,
    quantity,
    unit: 'Stk',
    checked: false,
    addedAt: now,
    updatedAt: now,
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
  await touchItem(id, { quantity: q });
  emitChange();
}

export async function setQuantity(id: string, value: number): Promise<void> {
  const it = await db.items.get(id);
  if (!it) return;
  const q = Math.max(1, Math.min(999, Math.round(value)));
  await touchItem(id, { quantity: q });
  emitChange();
}

/**
 * Pick a brand for an item. With no `store`, this updates the global brand
 * (what we show when no store filter is active). With a `store`, it writes
 * to that slot in `brandByStore` so switching store chips swaps brands. We
 * also opportunistically backfill the global `brand` if the item never had
 * one — first pick anywhere becomes the global fallback too.
 */
export async function setBrand(
  id: string,
  brand: string | null,
  store?: Store,
): Promise<void> {
  const it = await db.items.get(id);
  if (!it) return;
  if (store) {
    const next = { ...(it.brandByStore ?? {}) } as Partial<Record<Store, string>>;
    if (brand) next[store] = brand;
    else delete next[store];
    const patch: Partial<Item> = { brandByStore: next };
    if (brand && !it.brand) patch.brand = brand;
    await touchItem(id, patch);
  } else {
    await touchItem(id, { brand: brand ?? undefined });
  }
  emitChange();
}

export async function toggleChecked(id: string): Promise<void> {
  const it = await db.items.get(id);
  if (!it) return;
  await touchItem(id, { checked: !it.checked });
  emitChange();
}

/**
 * Soft-delete on shared lists, hard-delete on local-only lists.
 *
 * The sync push payload is built from `db.items.where(listId).toArray()`,
 * so a hard delete on a *shared* list makes the row vanish from the
 * payload entirely. The server's LWW merge only updates items that appear
 * in `incoming.items`; items absent from the payload stay alive on the
 * server. The next pull then re-creates them locally — zombie items.
 *
 * Writing a tombstone (`deletedAt` + bumped `updatedAt`) means the
 * deletion *appears* in the next push payload, server LWW takes it (newer
 * `updatedAt` wins), peers pull the tombstone and hard-delete their copy.
 * `applyRemote` finally hard-deletes our local tombstone once the server
 * has TTL-pruned it (30 days), so Dexie doesn't accumulate ghosts.
 *
 * Local-only lists don't need this dance — no peers, no resurrection
 * vector — so we still hard-delete to keep IndexedDB lean.
 */
export async function deleteItem(id: string): Promise<void> {
  const item = await db.items.get(id);
  if (!item) return;
  const list = await db.lists.get(item.listId);
  if (list?.cloud) {
    const now = Date.now();
    await db.items.update(id, { deletedAt: now, updatedAt: now });
  } else {
    await db.items.delete(id);
  }
  emitChange();
}

export async function clearChecked(): Promise<void> {
  const activeList = getActiveListId();
  const list = await db.lists.get(activeList);
  const all = await db.items.where('listId').equals(activeList).toArray();
  const checkedIds = all.filter((it) => it.checked).map((it) => it.id);
  if (checkedIds.length === 0) return;
  if (list?.cloud) {
    // Tombstone each checked item with a fresh updatedAt so the LWW merge
    // on the server accepts them. See deleteItem above for the full rationale.
    const now = Date.now();
    await Promise.all(
      checkedIds.map((id) => db.items.update(id, { deletedAt: now, updatedAt: now })),
    );
  } else {
    await db.items.bulkDelete(checkedIds);
  }
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
      // Strip tombstones (rows with `deletedAt` set). On shared lists,
      // deleteItem now soft-deletes so the deletion can sync to peers;
      // those rows linger in Dexie until the server TTL-prunes them and
      // applyRemote hard-deletes locally. They must never reach the UI.
      const visible = all.filter((it) => !it.deletedAt);
      visible.sort(
        (a, b) =>
          Number(a.checked) - Number(b.checked) ||
          a.position - b.position ||
          a.addedAt - b.addedAt,
      );
      setItems(visible);
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
