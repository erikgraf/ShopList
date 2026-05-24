import type { ReactNode } from 'react';

/**
 * Hand-drawn line-icons for ShopList. Every icon shares the same chassis —
 * 24×24 viewBox, fill=none, stroke=currentColor, stroke-width=1.5,
 * stroke-linecap=round, stroke-linejoin=round — so they all read as one set.
 * Stroke colour is inherited via `currentColor`, so the dark-green tile in
 * `CategoryAvatar` tints the icon automatically.
 *
 * Each entry is just the inner SVG fragment; the wrapper <svg> is applied
 * by the `CatalogIcon` renderer in `icons.tsx`.
 */
export const ICONS: Record<string, () => ReactNode> = {
  // --- Obst & Gemüse ---
  kartoffel: () => (
    <>
      <path d="M14.5 5.5C17.5 5.5 21 8 21 12.5C21 17 18 20 13.5 20C9 20 6.5 17 6.5 13C6.5 9.5 9.5 5.5 14.5 5.5Z" />
      <path d="M7 6C4 7.5 2 10.5 2 14.5C2 18 4.5 19.5 6.5 20" />
      <path d="M12 10.5C12 10.5 13 10 13.5 10.5" />
      <path d="M16 15C16.5 15.5 17.5 15.5 17.5 15" />
      <path d="M9 15.5C9 15.5 9.5 16 10 15.5" />
      <path d="M16 8C16 8 16.5 7.5 17 8" />
    </>
  ),
  apfel: () => (
    <>
      <path d="M12 8 C9 8 6 10 6 14 C6 17.5 8 20.5 11 20.5 C11.6 20.5 12.4 20.5 13 20.5 C16 20.5 18 17.5 18 14 C18 10 15 8 12 8 Z" />
      <path d="M11 8.5 C11.5 9 12.5 9 13 8.5" />
      <path d="M12 8 L12 5.5" />
      <path d="M12 6 C13.5 4.5 15.5 4.5 16 6.5 C14.5 7.5 13 7 12 6 Z" />
    </>
  ),
  banane: () => (
    <>
      <path d="M5 6 C5 12 8 17 14 19 C17 20 19 19 19.5 17.5 C16 17 11 13 7 7 C6 6 5 6 5 6 Z" />
      <path d="M5 6 L4 4.5" />
      <path d="M19.5 17.5 L20.5 18.5" />
    </>
  ),
  tomate: () => (
    <>
      <circle cx="12" cy="14" r="6.5" />
      <path d="M9 9 L11 7 L13 7 L15 9" />
      <path d="M12 7 L12 4.5" />
      <path d="M12 4.5 C13.5 4 14 5 13.5 5.5" />
    </>
  ),
  salat: () => (
    <>
      <path d="M4 18 C4 14 7.5 11 12 11 C16.5 11 20 14 20 18 Z" />
      <path d="M7 13 C7 10 9 7.5 12 8.5" />
      <path d="M17 13 C17 10 15 7.5 12 8.5" />
      <path d="M12 8.5 L12 11" />
    </>
  ),
  karotte: () => (
    <>
      <path d="M9 8.5 L15 8.5 L12.5 20.5 L11.5 20.5 Z" />
      <path d="M10.5 8.5 L9.5 5" />
      <path d="M12 8.5 L12 4" />
      <path d="M13.5 8.5 L14.5 5" />
      <path d="M10.5 12 L13.5 12" />
      <path d="M11 15 L13 15" />
    </>
  ),
  zwiebel: () => (
    <>
      <path d="M5 14 C5 10 8 7.5 12 7.5 C16 7.5 19 10 19 14 C19 18 16 20.5 12 20.5 C8 20.5 5 18 5 14 Z" />
      <path d="M10.5 7.5 L9.5 4.5" />
      <path d="M12 7.5 L12 3.5" />
      <path d="M13.5 7.5 L14.5 4.5" />
      <path d="M9 14 C10 12 14 12 15 14" />
    </>
  ),
  erdbeere: () => (
    <>
      <path d="M12 8 C9 6 5 7.5 5 11 C5 15.5 9 19.5 12 20.5 C15 19.5 19 15.5 19 11 C19 7.5 15 6 12 8 Z" />
      <path d="M9.5 8 L8.5 5.5 L10.5 6 L12 4.5 L13.5 6 L15.5 5.5 L14.5 8" />
      <path d="M9.5 12 L9.5 12.4" />
      <path d="M12.5 13 L12.5 13.4" />
      <path d="M15 12 L15 12.4" />
      <path d="M10.5 15.5 L10.5 15.9" />
      <path d="M13.5 16 L13.5 16.4" />
    </>
  ),
  blaubeere: () => (
    <>
      <circle cx="9" cy="14.5" r="3.5" />
      <circle cx="15" cy="14.5" r="3.5" />
      <circle cx="12" cy="10" r="3.5" />
      <path d="M11 9.5 L12 8.2 L13 9.5" />
      <path d="M8 14 L9 13 L10 14" />
      <path d="M14 14 L15 13 L16 14" />
    </>
  ),
  zucchini: () => (
    <>
      <path d="M7 8 C9 6.5 13 6.5 15 8 L18 17.5 C18.5 19 17.5 20.5 16 20.5 L8 20.5 C6.5 20.5 5.5 19 6 17.5 Z" />
      <path d="M10 7 L10 4.5 L13 4.5 L13 7" />
      <path d="M11.5 4.5 C12 3.5 13 3.5 13.5 4.5" />
      <path d="M9 12 L9.5 18" />
    </>
  ),
  brokkoli: () => (
    <>
      <path d="M5.5 11 C5.5 9 7 8 8.5 8.5 C9 6.5 11 6 12 7.5 C13 6 15 6.5 15.5 8.5 C17 8 18.5 9 18.5 11 C19.5 12 19 14 17.5 14 H6.5 C5 14 4.5 12 5.5 11 Z" />
      <path d="M10 14 V20 H14 V14" />
      <path d="M11.7 14 V20" />
      <path d="M10 17.5 H14" />
    </>
  ),
  birne: () => (
    <>
      <path d="M12 7.5 C10.5 7.5 9.5 9.5 9.5 11.5 C8.5 13 7.5 15 8.5 17 C9 19 10.5 20.5 12 20.5 C13.5 20.5 15 19 15.5 17 C16.5 15 15.5 13 14.5 11.5 C14.5 9.5 13.5 7.5 12 7.5 Z" />
      <path d="M12 7.5 L12 5" />
      <path d="M12 5.5 C13.5 4.5 15.5 5 15 6.5 C13.5 7.2 12.5 6.5 12 5.5 Z" />
    </>
  ),
  trauben: () => (
    <>
      <circle cx="12" cy="8.5" r="2" />
      <circle cx="9" cy="11" r="2" />
      <circle cx="15" cy="11" r="2" />
      <circle cx="11" cy="13.5" r="2" />
      <circle cx="14" cy="13.5" r="2" />
      <circle cx="12.5" cy="16" r="2" />
      <circle cx="12" cy="18.5" r="1.8" />
      <path d="M12 6.5 L12 4.5" />
      <path d="M12 4.5 C13.5 3.5 15 5 14 6" />
    </>
  ),
  gurke: () => (
    <>
      <path d="M4 9.5 L20 14.5 C20.8 14.8 21 15.5 20.5 16 L18.5 18 C18 18.5 17.3 18.3 17 17.5 L4 12.5 C3.2 12.2 3 11.5 3.5 11 L5 9.5 C5.5 9 6.2 9.2 6.5 10" />
      <path d="M7.5 11 L7.8 11.7" />
      <path d="M11 12.5 L11.3 13.2" />
      <path d="M14.5 14 L14.8 14.7" />
    </>
  ),
  paprika: () => (
    <>
      <path d="M6 10.5 C6 16 7.5 20 12 20.5 C16.5 20 18 16 18 10.5 C18 8.5 16 8 12 8 C8 8 6 8.5 6 10.5 Z" />
      <path d="M10.5 8 L11.5 5.5 L12.5 5.5 L13.5 8" />
      <path d="M12 5.5 L12 3.5" />
    </>
  ),
  zitrone: () => (
    <>
      <path d="M4 12.5 C4 8 8 4.5 12 4.5 C16 4.5 20 8 20 12.5 C20 16.5 16.5 19.5 12 19.5 C7.5 19.5 4 16.5 4 12.5 Z" />
      <path d="M19 7.5 L20.5 6" />
      <path d="M20.5 6 L19 5" />
    </>
  ),
  knoblauch: () => (
    <>
      <path d="M12 5 C9 5 7 8 7 12 C7 16 9 19 12 19 C15 19 17 16 17 12 C17 8 15 5 12 5 Z" />
      <path d="M9 11 C9 8 10.5 6 12 6" />
      <path d="M15 11 C15 8 13.5 6 12 6" />
      <path d="M12 5 L12 3.5" />
    </>
  ),
  bratwurst: () => (
    <>
      <path d="M4 17 C4 17 5 11 12 11 C19 11 20 17 20 17 C20 17 19 14.5 12 14.5 C5 14.5 4 17 4 17 Z" />
      <path d="M4 17 C3 17 3 17 4 17" />
      <path d="M20 17 C21 17 21 17 20 17" />
    </>
  ),
  salami: () => (
    <>
      <circle cx="12" cy="13" r="6.5" />
      <circle cx="9" cy="11" r="0.7" />
      <circle cx="14" cy="11" r="0.6" />
      <circle cx="11" cy="14" r="0.5" />
      <circle cx="15" cy="15" r="0.7" />
      <circle cx="9" cy="15" r="0.5" />
    </>
  ),
  schinken: () => (
    <>
      <path d="M5 14 C5 11 7 9 11 9 C16 9 18 12 18 14 C18 16.5 16 18.5 12 18.5 C8 18.5 5 16.5 5 14 Z" />
      <path d="M18 14 L20 13" />
      <path d="M20 13 C21 12.5 21 14.5 20 14" />
      <path d="M5 14 L4 13.5" />
    </>
  ),
  salz: () => (
    <>
      <path d="M9 5 H15 V8 H9 Z" />
      <path d="M9 8 V20 H15 V8" />
      <circle cx="11" cy="6.5" r="0.4" />
      <circle cx="13" cy="6.5" r="0.4" />
      <circle cx="12" cy="7" r="0.4" />
      <path d="M10 13 H14" />
      <path d="M10 16 H14" />
    </>
  ),
  pfeffer: () => (
    <>
      <path d="M8.5 4 H15.5 V8 H8.5 Z" />
      <path d="M8 8 H16 V20 H8 Z" />
      <path d="M9 13 H15" />
      <path d="M9 16 H15" />
      <circle cx="10.5" cy="6" r="0.3" fill="currentColor" />
      <circle cx="13.5" cy="6" r="0.3" fill="currentColor" />
      <circle cx="12" cy="6" r="0.3" fill="currentColor" />
    </>
  ),
  olivenoel: () => (
    <>
      <path d="M11 3.5 H13 V6.5 H11 Z" />
      <path d="M10 6.5 H14 V8.5 L15 10 V20 H9 V10 L10 8.5 Z" />
      <path d="M10.5 13 C12 11 12 18 13.5 16" />
    </>
  ),
  mehl: () => (
    <>
      <path d="M6 8 L8 5.5 H16 L18 8 V20 H6 Z" />
      <path d="M8 5.5 V8" />
      <path d="M16 5.5 V8" />
      <path d="M6 8 H18" />
      <path d="M9 12 H15" />
      <path d="M9 14 H13" />
      <circle cx="10" cy="17" r="0.4" />
      <circle cx="13" cy="17" r="0.4" />
    </>
  ),
  reis: () => (
    <>
      <path d="M6 6 L8 4 H16 L18 6 V20 H6 Z" />
      <path d="M8 4 V6" />
      <path d="M16 4 V6" />
      <path d="M6 6 H18" />
      <path d="M9.5 10 L9.7 11" />
      <path d="M12 10.5 L12.2 11.5" />
      <path d="M14.5 10 L14.7 11" />
      <path d="M10 13.5 L10.2 14.5" />
      <path d="M13.5 13.5 L13.7 14.5" />
    </>
  ),
  nudeln: () => (
    <>
      <ellipse cx="12" cy="16" rx="9" ry="2" />
      <path d="M5 11 C7 9 9 13 11 11 C13 9 15 13 17 11 C19 9 19 14 19 14" />
      <path d="M5 13 C7 11 9 15 11 13 C13 11 15 15 17 13" />
      <path d="M3 16 V13 C3 11 21 11 21 13 V16" />
    </>
  ),

  // --- Brot & Gebäck ---
  brot: () => (
    <>
      <path d="M3.5 14 C3.5 10.5 7 8 12 8 C17 8 20.5 10.5 20.5 14 V15.5 C20.5 17 19 18.5 17 18.5 H7 C5 18.5 3.5 17 3.5 15.5 Z" />
      <path d="M8.5 11 L9.5 13.5" />
      <path d="M11.5 10.5 L12.5 13" />
      <path d="M14.5 11 L15.5 13.5" />
    </>
  ),
  broetchen: () => (
    <>
      <ellipse cx="12" cy="13.5" rx="8" ry="5" />
      <path d="M9.5 10.5 L14.5 16.5" />
    </>
  ),
  toast: () => (
    <>
      <path d="M5 7 C5 6 6 5.5 7 5.5 H17 C18 5.5 19 6 19 7 V18 C19 19 18 19.5 17 19.5 H7 C6 19.5 5 19 5 18 Z" />
      <path d="M5 9.5 H19" />
    </>
  ),

  // --- Milchprodukte & Eier ---
  milch: () => (
    <>
      <path d="M7 8.5 V20 H17 V8.5 L15 5 H9 Z" />
      <path d="M9 5 L9 8.5" />
      <path d="M15 5 L15 8.5" />
      <path d="M7 8.5 L17 8.5" />
      <path d="M9.5 12.5 H14.5" />
      <path d="M9.5 15 H13" />
    </>
  ),
  butter: () => (
    <>
      <path d="M3.5 10 L19.5 8 L20.5 11.5 L4.5 13.5 Z" />
      <path d="M4.5 13.5 V18 H20.5 V11.5" />
      <path d="M19.5 8 V12" />
      <path d="M9 14.5 H16" />
    </>
  ),
  joghurt: () => (
    <>
      <path d="M7 10 V19 C7 20 8 20.5 9 20.5 H15 C16 20.5 17 20 17 19 V10 Z" />
      <path d="M5.5 10 H18.5" />
      <path d="M9.5 7 H14.5 V10 H9.5 Z" />
      <path d="M9.5 14 H14.5" />
    </>
  ),
  kaese: () => (
    <>
      <path d="M3 19 H21 V8 Z" />
      <path d="M3 19 L21 8" />
      <circle cx="11" cy="15.5" r="1.3" />
      <circle cx="15" cy="13" r="1" />
      <circle cx="13" cy="17" r="0.7" />
    </>
  ),
  ei: () => (
    <>
      <path d="M12 4.5 C8.5 4.5 6 9 6 14 C6 17.5 8.5 20.5 12 20.5 C15.5 20.5 18 17.5 18 14 C18 9 15.5 4.5 12 4.5 Z" />
      <path d="M9 10 C9.5 9 10.5 8.5 11 9" />
    </>
  ),

  // --- Fleisch & Fisch ---
  fisch: () => (
    <>
      <path d="M3 13 C3 10 7 8 11 8 C15 8 18 10.5 19 13 C18 15.5 15 18 11 18 C7 18 3 16 3 13 Z" />
      <path d="M19 13 L22 9.5 V16.5 Z" />
      <circle cx="7" cy="12" r="0.6" />
      <path d="M12 11 L13 13" />
      <path d="M14 11 L15 13" />
    </>
  ),
  wurst: () => (
    <>
      <path d="M5 10 H19 C20 10 21 11 21 12 V13 C21 14 20 15 19 15 H5 C4 15 3 14 3 13 V12 C3 11 4 10 5 10 Z" />
      <path d="M5 10 C4 10.5 4 14.5 5 15" />
      <path d="M19 10 C20 10.5 20 14.5 19 15" />
    </>
  ),

  // --- Tiefkühl ---
  pizza: () => (
    <>
      <path d="M3.5 7.5 L20.5 7.5 L12 20.5 Z" />
      <path d="M3.5 7.5 C3.5 6.5 12 6 20.5 7.5" />
      <circle cx="9" cy="11" r="1" />
      <circle cx="15" cy="11" r="1" />
      <circle cx="12" cy="15" r="1" />
    </>
  ),

  // --- Süßes & Knabberei ---
  schokolade: () => (
    <>
      <path d="M5 6.5 H19 V19.5 H5 Z" />
      <path d="M5 11 H19" />
      <path d="M5 15 H19" />
      <path d="M9.5 6.5 V19.5" />
      <path d="M14.5 6.5 V19.5" />
    </>
  ),

  // --- Getränke ---
  kaffee: () => (
    <>
      <path d="M5 9.5 H17 V15.5 C17 18 15 20 11 20 C7 20 5 18 5 15.5 Z" />
      <path d="M17 11.5 C19 11.5 20 12.5 20 14 C20 15.5 19 16.5 17 16.5" />
      <path d="M3.5 20.5 H18.5" />
      <path d="M8.5 5 C8.5 6 9.5 6 9.5 7" />
      <path d="M11.5 4 C11.5 5 12.5 5 12.5 6" />
      <path d="M14.5 5 C14.5 6 15.5 6 15.5 7" />
    </>
  ),
  wasser: () => (
    <>
      <path d="M10 4 H14 V7.5 L15.5 9.5 V19 C15.5 20 14.5 20.5 13.5 20.5 H10.5 C9.5 20.5 8.5 20 8.5 19 V9.5 L10 7.5 Z" />
      <path d="M10 7.5 H14" />
      <path d="M9.5 14 H14.5" />
    </>
  ),
  wein: () => (
    <>
      <path d="M11 3.5 H13 V7.5 L14 9 V19.5 C14 20.2 13.5 20.5 13 20.5 H11 C10.5 20.5 10 20.2 10 19.5 V9 L11 7.5 Z" />
      <path d="M10 13.5 H14" />
      <path d="M11 16 H13" />
    </>
  ),
  bier: () => (
    <>
      <path d="M7 8 H15 V20 H7 Z" />
      <path d="M15 11 C17 11 18 12 18 14 C18 16 17 17 15 17" />
      <path d="M7 8 C7 7 9 6 11 7 C13 6 15 7 15 8" />
      <path d="M7 11 H15" />
    </>
  ),
  tee: () => (
    <>
      <path d="M9 8 H15 V14 L13 18 H11 L9 14 Z" />
      <path d="M12 8 L12 4.5" />
      <path d="M10.5 3 H13.5 V4.5 H10.5 Z" />
    </>
  ),

  // --- Frühstück & Aufstrich ---
  honig: () => (
    <>
      <rect x="6" y="9" width="12" height="11.5" rx="1" />
      <rect x="8" y="6.5" width="8" height="2.5" />
      <path d="M11 13.5 L12 12.5 L13 13.5 V15.5 L12 16.5 L11 15.5 Z" />
    </>
  ),
  marmelade: () => (
    <>
      <rect x="6" y="9" width="12" height="11.5" rx="1" />
      <rect x="8" y="6.5" width="8" height="2.5" />
      <circle cx="10" cy="14" r="1" />
      <circle cx="12" cy="15.5" r="1" />
      <circle cx="14" cy="14" r="1" />
    </>
  ),
  nutella: () => (
    <>
      <rect x="6" y="9" width="12" height="11.5" rx="1" />
      <rect x="8" y="6.5" width="8" height="2.5" />
      <path d="M9 13 C9 16 11 18 12 18 C13 18 15 16 15 13" />
    </>
  ),

  // --- Körperpflege ---
  zahnpasta: () => (
    <>
      <rect x="10" y="3" width="4" height="2.5" />
      <path d="M9 5.5 H15 V18 L16.5 20.5 H7.5 L9 18 Z" />
      <path d="M7.5 20.5 H16.5" />
      <path d="M10 9 H14" />
      <path d="M10 11 H14" />
    </>
  ),
  shampoo: () => (
    <>
      <rect x="7" y="9" width="10" height="11.5" rx="1.5" />
      <rect x="10" y="6" width="4" height="3" />
      <path d="M10 4 H14 V6 H10 Z" />
      <path d="M14 4 L16 4 L16 5.5 L14 5.5" />
      <path d="M9 13 H15" />
      <path d="M9 15 H15" />
    </>
  ),
  seife: () => (
    <>
      <rect x="3" y="11" width="14" height="7.5" rx="2" />
      <path d="M6 14.5 H14" />
      <circle cx="17.5" cy="8.5" r="1.3" />
      <circle cx="20" cy="6.5" r="0.9" />
      <circle cx="20.5" cy="10.5" r="0.7" />
      <circle cx="14" cy="6" r="0.6" />
    </>
  ),
  deo: () => (
    <>
      <ellipse cx="12" cy="4.5" rx="2.5" ry="1.2" />
      <path d="M9.5 4.5 V8 H14.5 V4.5" />
      <path d="M9.5 8 H14.5 V20 H9.5 Z" />
      <path d="M10.5 12 H13.5" />
      <path d="M10.5 15 H13.5" />
    </>
  ),

  // --- Haushalt ---
  sprayflasche: () => (
    <>
      <path d="M9 4 H13 V6 H9 Z" />
      <path d="M11 6 V9" />
      <path d="M8 9 H16 V20 H8 Z" />
      <path d="M8 12 L5.5 13 V16 L8 17" />
      <path d="M10 14 H14" />
      <path d="M10 17 H14" />
      <path d="M13.5 4 L15.5 3" />
      <path d="M14 5 L16 5" />
      <path d="M13.5 6 L15.5 7" />
    </>
  ),
  waschmittel: () => (
    <>
      <path d="M10 4 H14 V8 H10 Z" />
      <path d="M7 8 H17 V20 H7 Z" />
      <path d="M17 11 C19.2 11 19.2 14 17 14" />
      <path d="M9 11 H15" />
      <path d="M9 14 H15" />
      <path d="M9 17 H15" />
    </>
  ),
  klopapier: () => (
    <>
      <ellipse cx="12" cy="6.5" rx="6" ry="1.7" />
      <ellipse cx="12" cy="6.5" rx="1.6" ry="0.5" />
      <path d="M6 6.5 V18 C6 19 8.7 19.8 12 19.8 C15.3 19.8 18 19 18 18 V6.5" />
      <path d="M18 13 C19 13 19.5 14 19 15 L17.5 17" />
    </>
  ),

  // --- Baby ---
  babyflasche: () => (
    <>
      <path d="M10.5 4.5 C10.5 3 13.5 3 13.5 4.5" />
      <path d="M9.5 4.5 H14.5 V6.5 H9.5 Z" />
      <path d="M8.5 6.5 V19 C8.5 20 9.5 20.5 10.5 20.5 H13.5 C14.5 20.5 15.5 20 15.5 19 V6.5 Z" />
      <path d="M10 10 H11" />
      <path d="M10 13 H11" />
      <path d="M10 16 H11" />
    </>
  ),

  // --- Vorrat ---
  konserve: () => (
    <>
      <ellipse cx="12" cy="6.5" rx="6" ry="1.7" />
      <path d="M6 6.5 V18 C6 19 8.7 19.8 12 19.8 C15.3 19.8 18 19 18 18 V6.5" />
      <path d="M6 8.7 C7.5 9.6 16.5 9.6 18 8.7" />
      <path d="M8 13 H16" />
      <path d="M9 16 H15" />
    </>
  ),

  // --- Getränke (extras) ---
  saft: () => (
    <>
      <path d="M7 8 V20 H17 V8 L14.5 4.5 H9.5 Z" />
      <path d="M7 8 H17" />
      <path d="M9.5 4.5 V8" />
      <path d="M14.5 4.5 V8" />
      <path d="M11.5 3 H13 V4.5 H11.5 Z" />
      <path d="M9 13 H15" />
      <path d="M9 16 H13" />
    </>
  ),
  cola: () => (
    <>
      <path d="M8 6 H16 V8 H8 Z" />
      <path d="M8 8 H16 V19 C16 20 15 20.5 14 20.5 H10 C9 20.5 8 20 8 19 Z" />
      <path d="M8 11 H16" />
      <path d="M9 15 C10 14.5 14 14.5 15 15" />
    </>
  ),

  // --- Gewürze, Öle & Saucen (extras) ---
  senf: () => (
    <>
      <path d="M10.5 3.5 H13.5 V6 H10.5 Z" />
      <path d="M11 6 H13 V8" />
      <path d="M8 8.5 C8 7.5 16 7.5 16 8.5 V19 C16 20 14.5 20.5 12 20.5 C9.5 20.5 8 20 8 19 Z" />
      <path d="M9 12 H15" />
      <path d="M9 15.5 H15" />
    </>
  ),

  // --- Süßes & Knabberei (extras) ---
  chips: () => (
    <>
      <path d="M6 5 L18 5 L17 20 L7 20 Z" />
      <path d="M6 5 L18 5" />
      <path d="M6 7 L18 7" />
      <path d="M8 11 L10 13" />
      <path d="M13 12 L15 14" />
      <path d="M9 16 L11 18" />
      <path d="M14 17 L15.5 18.5" />
    </>
  ),
  keks: () => (
    <>
      <circle cx="12" cy="12" r="7.5" />
      <circle cx="9" cy="10" r="0.7" />
      <circle cx="14" cy="9" r="0.6" />
      <circle cx="15" cy="13" r="0.7" />
      <circle cx="10" cy="14" r="0.6" />
      <circle cx="13" cy="15" r="0.5" />
    </>
  ),

  // --- Obst & Gemüse (expanded) ---
  orange: () => (
    <>
      <circle cx="12" cy="13.5" r="6.8" />
      <path d="M11 6.7 Q12.5 5 14.5 5.5 Q13.5 6.9 12 6.9" />
      <path d="M12 6.9 L12 5.2" />
      <circle cx="12" cy="18.8" r="0.4" fill="currentColor" />
    </>
  ),
  pfirsich: () => (
    <>
      <path d="M12 7 C8 7 6 10 6 13.5 C6 17 8.5 20 12 20 C15.5 20 18 17 18 13.5 C18 10 16 7 12 7 Z" />
      <path d="M12 7.5 Q11.5 12 12 19.5" />
      <path d="M12.5 7 Q14 5.5 16 6 Q14.5 7.6 12.5 7.3" />
    </>
  ),
  kirsche: () => (
    <>
      <circle cx="8.5" cy="16" r="3" />
      <circle cx="15" cy="15.5" r="3" />
      <path d="M8.5 13 Q10 7 12 5" />
      <path d="M15 12.5 Q13.5 7 12 5" />
      <path d="M12 5.5 Q14 4 15.5 5.5 Q13.5 6.6 12 5.8" />
    </>
  ),
  himbeere: () => (
    <>
      <circle cx="9.5" cy="13" r="1.5" />
      <circle cx="12" cy="12.5" r="1.5" />
      <circle cx="14.5" cy="13" r="1.5" />
      <circle cx="10.7" cy="15.5" r="1.5" />
      <circle cx="13.3" cy="15.5" r="1.5" />
      <circle cx="12" cy="17.7" r="1.4" />
      <path d="M9.5 10 Q10.7 8 12 8.5 Q13.3 8 14.5 10" />
    </>
  ),
  melone: () => (
    <>
      <path d="M4 9 Q4 8 5 8 H19 Q20 8 20 9 Q20 16 12 19 Q4 16 4 9 Z" />
      <path d="M6 9 Q6.5 14 12 16.5 Q17.5 14 18 9" />
      <circle cx="9.5" cy="11" r="0.4" fill="currentColor" />
      <circle cx="12.5" cy="13" r="0.4" fill="currentColor" />
      <circle cx="14.5" cy="11" r="0.4" fill="currentColor" />
    </>
  ),
  ananas: () => (
    <>
      <path d="M8.5 11 Q8.5 9.2 12 9.2 Q15.5 9.2 15.5 11 V17 Q15.5 20 12 20 Q8.5 20 8.5 17 Z" />
      <path d="M10 12 L11.5 13.5" />
      <path d="M14 12 L12.5 13.5" />
      <path d="M10 15 L11.5 16.5" />
      <path d="M14 15 L12.5 16.5" />
      <path d="M10 9.2 Q9.5 6.5 11 5.5 Q11.5 7.5 12 7.5 Q12.5 7.5 13 5.5 Q14.5 6.5 14 9.2" />
      <path d="M12 7.5 L12 4.5" />
    </>
  ),
  kiwi: () => (
    <>
      <circle cx="12" cy="12.5" r="7" />
      <circle cx="12" cy="12.5" r="4.3" />
      <circle cx="12" cy="12.5" r="0.9" />
      <circle cx="12" cy="8.7" r="0.3" fill="currentColor" />
      <circle cx="15" cy="11" r="0.3" fill="currentColor" />
      <circle cx="14" cy="15" r="0.3" fill="currentColor" />
      <circle cx="10" cy="15.5" r="0.3" fill="currentColor" />
      <circle cx="9" cy="11" r="0.3" fill="currentColor" />
    </>
  ),
  avocado: () => (
    <>
      <path d="M12 5 C9.5 5 8.5 8 8.5 11 C7.5 13 7 15.5 8 17.5 C9 19.5 10.5 20.5 12 20.5 C13.5 20.5 15 19.5 16 17.5 C17 15.5 16.5 13 15.5 11 C15.5 8 14.5 5 12 5 Z" />
      <path d="M12 8 C10.5 8 10 10 10 12 C9.5 13.5 9.5 15.5 10.3 17 C11 18.2 11.5 18.5 12 18.5 C12.5 18.5 13 18.2 13.7 17 C14.5 15.5 14.5 13.5 14 12 C14 10 13.5 8 12 8 Z" />
      <circle cx="12" cy="14.5" r="2.1" />
    </>
  ),
  pflaume: () => (
    <>
      <path d="M12 7 C8.5 7 6.5 10 6.5 13.5 C6.5 17 9 20 12 20 C15 20 17.5 17 17.5 13.5 C17.5 10 15.5 7 12 7 Z" />
      <path d="M12 7.5 Q11.5 13 12 19.5" />
      <path d="M12 7 L12.5 5" />
    </>
  ),
  mango: () => (
    <>
      <path d="M7 11 C7 7.5 10 6 13 6.5 C16.5 7 18 10 17.5 13.5 C17 17 14 19.5 11 19 C8 18.5 7 14.5 7 11 Z" />
      <path d="M13 6.5 L13.5 4.8" />
    </>
  ),
  blumenkohl: () => (
    <>
      <path d="M6 12 Q6 9 8.5 9 Q9 7 11 7.5 Q12 6.5 13 7.5 Q15 7 15.5 9 Q18 9 18 12 Q18 14 16 14 H8 Q6 14 6 12 Z" />
      <path d="M8 14 Q9 19 12 20 Q15 19 16 14" />
      <path d="M8 14 Q5 13 5 16 Q6 17 8 16" />
      <path d="M16 14 Q19 13 19 16 Q18 17 16 16" />
    </>
  ),
  spinat: () => (
    <>
      <path d="M12 20 Q12 14 8 10 Q6 8 5 5 Q9 6 11 9 Q12 11 12 14" />
      <path d="M12 20 Q12 14 16 10 Q18 8 19 5 Q15 6 13 9 Q12 11 12 14" />
      <path d="M12 20 L12 13" />
    </>
  ),
  lauch: () => (
    <>
      <path d="M10 13 L10 19 Q10 20 11 20 H13 Q14 20 14 19 L14 13" />
      <path d="M10 13 Q9 8 8.5 4" />
      <path d="M12 13 L12 3.5" />
      <path d="M14 13 Q15 8 15.5 4" />
      <path d="M10.5 20 L10.5 21" />
      <path d="M12 20 L12 21.3" />
      <path d="M13.5 20 L13.5 21" />
    </>
  ),
  sellerie: () => (
    <>
      <path d="M8 20 Q7 13 8 8 H10 Q9.5 13 10 20 Z" />
      <path d="M11 20 Q11 13 11 8 H13 Q13 13 13 20 Z" />
      <path d="M14 20 Q15 13 14 8 H16 Q16.5 13 16 20 Z" />
      <path d="M8 8 Q9 5 11 6 Q12 4.5 13 6 Q15 5 16 8" />
    </>
  ),
  fenchel: () => (
    <>
      <path d="M8 13 Q8 10 12 10 Q16 10 16 13 Q16 19 12 20 Q8 19 8 13 Z" />
      <path d="M10 13 L10 19" />
      <path d="M12 12 L12 20" />
      <path d="M14 13 L14 19" />
      <path d="M10 10 Q9 6 8 4" />
      <path d="M12 10 L12 3.5" />
      <path d="M14 10 Q15 6 16 4" />
    </>
  ),
  aubergine: () => (
    <>
      <path d="M14 9 C17 11 18 15 16 18 C14 20.5 10 20.5 8 18 C6.5 16 7 12.5 10 10.5 C11.5 9.5 12.5 8 14 9 Z" />
      <path d="M13.5 9.5 Q14 7 16 6.5 Q17 7.5 16 9" />
      <path d="M14 9 L15.5 7" />
    </>
  ),
  kuerbis: () => (
    <>
      <path d="M12 8 C8 8 5.5 11 5.5 14 C5.5 17.5 8.5 20 12 20 C15.5 20 18.5 17.5 18.5 14 C18.5 11 16 8 12 8 Z" />
      <path d="M9 8.5 Q7.5 14 9 19.5" />
      <path d="M12 8 L12 20" />
      <path d="M15 8.5 Q16.5 14 15 19.5" />
      <path d="M12 8 Q12 6 13 5.5" />
    </>
  ),
  mais: () => (
    <>
      <path d="M9 7 Q9 5 12 5 Q15 5 15 7 V16 Q15 19 12 19 Q9 19 9 16 Z" />
      <path d="M10.5 6 L10.5 18" />
      <path d="M13.5 6 L13.5 18" />
      <path d="M10 9 H14" />
      <path d="M10 12 H14" />
      <path d="M10 15 H14" />
      <path d="M9 16 Q6 17 7 20" />
      <path d="M15 16 Q18 17 17 20" />
    </>
  ),
  erbsen: () => (
    <>
      <path d="M5 10 Q12 5 19 10 Q18 15 12 15 Q6 15 5 10 Z" />
      <circle cx="9" cy="11" r="1.2" />
      <circle cx="12" cy="11.5" r="1.2" />
      <circle cx="15" cy="11" r="1.2" />
      <path d="M5 10 L3.5 9" />
    </>
  ),
  bohnen: () => (
    <>
      <path d="M6 6 Q4.5 6.5 5 8 Q7 14 13 18.5 Q14.5 19.5 15 18 Q15.5 16.5 14 15.5 Q8.5 11.5 7 7 Q6.5 5.5 6 6 Z" />
      <path d="M10 5 Q8.5 5.5 9 7 Q11 13 17 17.5 Q18.5 18.5 19 17 Q19.5 15.5 18 14.5 Q12.5 10.5 11 6 Q10.5 4.5 10 5 Z" />
    </>
  ),
  spargel: () => (
    <>
      <path d="M9 20 L9 7" />
      <path d="M8 8 Q9 5 9 4.5 Q9 5 10 8" />
      <path d="M12 20 L12 6" />
      <path d="M11 7 Q12 4 12 3.5 Q12 4 13 7" />
      <path d="M15 20 L15 7" />
      <path d="M14 8 Q15 5 15 4.5 Q15 5 16 8" />
      <path d="M8.5 19.5 H15.5" />
    </>
  ),
  rotebete: () => (
    <>
      <path d="M12 9 C8.5 9 6.5 11.5 6.5 14.5 C6.5 17 8.5 18.5 11 19.5 Q12 20 12 20 Q12 20 13 19.5 C15.5 18.5 17.5 17 17.5 14.5 C17.5 11.5 15.5 9 12 9 Z" />
      <path d="M12 20 L12 21.5" />
      <path d="M10 9 Q9 5 8 4" />
      <path d="M12 9 L12 3.5" />
      <path d="M14 9 Q15 5 16 4" />
    </>
  ),
  radieschen: () => (
    <>
      <circle cx="12" cy="14" r="5" />
      <path d="M12 19 L12 21" />
      <path d="M10 9.5 Q9 6 8.5 5" />
      <path d="M12 9 L12 4" />
      <path d="M14 9.5 Q15 6 15.5 5" />
    </>
  ),
  pilz: () => (
    <>
      <path d="M5 12 Q5 7 12 7 Q19 7 19 12 Q19 12.5 18.5 12.5 H5.5 Q5 12.5 5 12 Z" />
      <path d="M9.5 12.5 Q9.5 17 9 19 Q9 20 12 20 Q15 20 15 19 Q14.5 17 14.5 12.5" />
      <circle cx="9" cy="10" r="0.5" fill="currentColor" />
      <circle cx="13" cy="9.5" r="0.5" fill="currentColor" />
      <circle cx="15.5" cy="10.5" r="0.4" fill="currentColor" />
    </>
  ),
  ingwer: () => (
    <>
      <path d="M6 13 Q5 10 8 10 Q9 7 11 9 Q13 8 14 10 Q17 9 17 12 Q19 13 17.5 15 Q18 18 15 17 Q14 19 12 17.5 Q10 19 9 16.5 Q6 17 6 14 Q5.5 13.5 6 13 Z" />
      <path d="M9 12 Q9.5 11.5 10 12" />
      <path d="M14 13 Q14.5 12.5 15 13" />
    </>
  ),
  kohl: () => (
    <>
      <circle cx="12" cy="13" r="7.5" />
      <path d="M12 5.5 Q8 9 9 13 Q10 17 12 20.5" />
      <path d="M12 5.5 Q16 9 15 13 Q14 17 12 20.5" />
      <path d="M5 11 Q9 12 9.5 13" />
      <path d="M19 11 Q15 12 14.5 13" />
    </>
  ),
  rosenkohl: () => (
    <>
      <circle cx="12" cy="13" r="6" />
      <path d="M12 7 Q9 10 9.5 13 Q10 16 12 19" />
      <path d="M12 7 Q15 10 14.5 13 Q14 16 12 19" />
      <path d="M6.5 12 Q9 12.5 9.5 13.5" />
      <path d="M17.5 12 Q15 12.5 14.5 13.5" />
      <path d="M12 7 L12 4.8" />
    </>
  ),
  kohlrabi: () => (
    <>
      <circle cx="12" cy="14.5" r="5.5" />
      <path d="M9.5 10 Q8.5 5 7.5 4" />
      <path d="M12 9.5 L12 3.5" />
      <path d="M14.5 10 Q15.5 5 16.5 4" />
      <path d="M7.5 4 Q6 4.5 6.5 6" />
      <path d="M16.5 4 Q18 4.5 17.5 6" />
    </>
  ),
  kraeuter: () => (
    <>
      <path d="M12 20 L12 6" />
      <path d="M12 9 Q9 8 8 5 Q11 5.5 12 8" />
      <path d="M12 9 Q15 8 16 5 Q13 5.5 12 8" />
      <path d="M12 13 Q9.5 12.5 8.5 10 Q11 10.5 12 12.5" />
      <path d="M12 13 Q14.5 12.5 15.5 10 Q13 10.5 12 12.5" />
      <path d="M12 6 Q11 4.5 12 3.5 Q13 4.5 12 6" />
    </>
  ),
};

export function hasIcon(name: string): boolean {
  return name in ICONS;
}
