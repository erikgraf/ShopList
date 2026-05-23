import type { ReactNode } from 'react';

/**
 * Hand-drawn "doodle" icon set — chunkier strokes, cute touches (faces on
 * the egg and fish), texture marks (seeds, crust dots, water ripples). It
 * sits alongside the cleaner line-art set in `icons-library.tsx`; the user
 * picks which one is active via the Symbolstil row in the FilterSheet, and
 * any icon name missing from this set transparently falls back to the line
 * version.
 *
 * Same 24×24 chassis as the line set so a swap is a pure visual change — no
 * sizing adjustments needed in `CatalogIcon`. The renderer in `icons.tsx`
 * applies a slightly thicker stroke (1.8 vs 1.5) when this set is active so
 * the hand-drawn feel reads even at small sizes.
 */
export const DOODLE_ICONS: Record<string, () => ReactNode> = {
  apfel: () => (
    <>
      <path d="M12 8 Q8.5 7.5 7 10.5 Q5.8 14 7.8 18 Q9.7 21 12 21 Q14.3 21 16.2 18 Q18.2 14 17 10.5 Q15.5 7.5 12 8 Z" />
      <path d="M12 8 L11.8 5.5" />
      <path d="M11.8 6 Q14 5 15.6 6.5 Q14 7.5 12.3 7" />
      <path d="M9.5 11 Q10 10.5 10.5 11" />
      <path d="M9 14 Q9.5 13.5 10 14" />
    </>
  ),
  banane: () => (
    <>
      <path d="M5 6.5 Q5 14 12 18 Q16 19.5 19 17.5 Q15.5 17 11.5 13.5 Q7 10 6.2 6.8 Q6 6 5 6.5 Z" />
      <path d="M5.5 6 L4 4.8" />
      <path d="M19 17.5 L20 18.8" />
      <path d="M8 10.5 Q9 11 10 10.5" />
      <path d="M11 13.5 Q12 14 13 13.5" />
    </>
  ),
  erdbeere: () => (
    <>
      <path d="M12 8 Q7.5 7.5 6 10.5 Q6 15 9 18.5 Q11 21 12 21 Q13 21 15 18.5 Q18 15 18 10.5 Q16.5 7.5 12 8 Z" />
      <path d="M8 8 Q9 6 10.5 7 Q10.5 5 12 5.5 Q13 4 14 6 Q15.5 6 16 8" />
      <path d="M12 5.5 L12 3.5" />
      <circle cx="9.5" cy="11.2" r="0.35" fill="currentColor" />
      <circle cx="11" cy="13.5" r="0.35" fill="currentColor" />
      <circle cx="13" cy="12.3" r="0.35" fill="currentColor" />
      <circle cx="14" cy="14.8" r="0.35" fill="currentColor" />
      <circle cx="10" cy="15.7" r="0.35" fill="currentColor" />
      <circle cx="12.5" cy="17.2" r="0.35" fill="currentColor" />
    </>
  ),
  tomate: () => (
    <>
      <path d="M12 9 Q7 8.5 6 13 Q6 18 10 20 Q12 20.5 14 20 Q18 18 18 13 Q17 8.5 12 9 Z" />
      <path d="M9.5 9 Q9 7 11 7 Q11 5.5 12 5.5 Q13 5.5 13 7 Q15 7 14.5 9" />
      <path d="M12 5.5 L12 3.5" />
      <path d="M9.5 12 Q10.5 11 11.5 12" />
    </>
  ),
  milch: () => (
    <>
      <path d="M7 9 V20 H17 V9 L15 5.5 H9 Z" />
      <path d="M9 5.5 V9" />
      <path d="M15 5.5 V9" />
      <path d="M7 9 H17" />
      <path d="M9.5 12 H14.5 V15 H9.5 Z" />
      <circle cx="11" cy="17" r="0.3" fill="currentColor" />
      <circle cx="13" cy="17" r="0.3" fill="currentColor" />
      <path d="M10 18.2 H14" />
    </>
  ),
  ei: () => (
    <>
      <path d="M12 5 Q8 5 6.5 11 Q5.5 16 7.5 19 Q9.5 21 12 21 Q14.5 21 16.5 19 Q18.5 16 17.5 11 Q16 5 12 5 Z" />
      <circle cx="10" cy="13.5" r="0.55" fill="currentColor" />
      <circle cx="14" cy="13.5" r="0.55" fill="currentColor" />
      <path d="M10.8 16 Q12 17 13.2 16" />
      <circle cx="9" cy="15.2" r="0.6" />
      <circle cx="15" cy="15.2" r="0.6" />
    </>
  ),
  kaese: () => (
    <>
      <path d="M4 18 L20 8 L20 18 Z" />
      <path d="M4 18 L20 18" />
      <path d="M20 8 L20 18" />
      <circle cx="11" cy="15" r="1.2" />
      <circle cx="14.5" cy="13" r="0.9" />
      <circle cx="16.5" cy="16" r="0.55" />
    </>
  ),
  brot: () => (
    <>
      <path d="M4 13.5 Q4 9 12 9 Q20 9 20 13.5 Q20 16 19 17.5 Q12 19 5 17.5 Q4 16 4 13.5 Z" />
      <path d="M8.5 11 L10 13.5" />
      <path d="M11.5 10.5 L13 13" />
      <path d="M14.5 11 L16 13.5" />
      <circle cx="8" cy="16" r="0.3" fill="currentColor" />
      <circle cx="12" cy="16.5" r="0.3" fill="currentColor" />
      <circle cx="16" cy="16" r="0.3" fill="currentColor" />
    </>
  ),
  fisch: () => (
    <>
      <path d="M3 13 Q5 9 11 9 Q17 9 19 13 Q17 17 11 17 Q5 17 3 13 Z" />
      <path d="M19 13 L22 10 L22 16 Z" />
      <circle cx="6.8" cy="11.8" r="0.85" />
      <circle cx="6.8" cy="11.8" r="0.4" fill="currentColor" />
      <path d="M9 13.2 Q9.5 14 9 15" />
      <path d="M12 11.2 Q12 13 12 15" />
      <path d="M15 11.2 Q15 13 15 15" />
    </>
  ),
  wasser: () => (
    <>
      <path d="M10 3.5 H14 V6 H10 Z" />
      <path d="M10 6 V8 L8.5 10 V19 Q8.5 20.5 10 20.5 H14 Q15.5 20.5 15.5 19 V10 L14 8 V6" />
      <path d="M8.5 12 H15.5" />
      <path d="M8.5 16 H15.5" />
      <path d="M10 13.5 Q11.5 13 13 13.5" />
      <path d="M10 15 Q11.5 14.5 13 15" />
    </>
  ),
  pizza: () => (
    // Triangular slice with a wonky bubbled crust along the bottom and
    // pepperoni-style topping dots scattered to give the surface texture
    // without crowding the silhouette at 26px.
    <>
      <path d="M12 4 Q9 9 7 14 Q5.5 18.5 6 19.5 Q12 21 18 19.5 Q18.5 18.5 17 14 Q15 9 12 4 Z" />
      <path d="M6 19.5 Q9 20.5 12 20.5 Q15 20.5 18 19.5" />
      <circle cx="10" cy="12.5" r="1" fill="currentColor" />
      <circle cx="14" cy="13" r="1" fill="currentColor" />
      <circle cx="12" cy="16.5" r="0.85" fill="currentColor" />
      <circle cx="9" cy="17" r="0.35" fill="currentColor" />
      <circle cx="15.5" cy="17" r="0.35" fill="currentColor" />
      <circle cx="11" cy="9.5" r="0.3" fill="currentColor" />
    </>
  ),
  konserve: () => (
    // Tin can — tilted top/bottom ovals (wonky parallel curves) with a
    // label band wrapping the middle and a couple of pull-tab dots on the
    // lid so the silhouette doesn't read as just a rectangle.
    <>
      <path d="M7 7 Q12 5.5 17 7" />
      <path d="M7 7 V20" />
      <path d="M17 7 V20" />
      <path d="M7 20 Q12 21.5 17 20" />
      <path d="M7 11 Q12 12.5 17 11" />
      <path d="M7 15 Q12 16.5 17 15" />
      <circle cx="11" cy="13" r="0.4" fill="currentColor" />
      <circle cx="13" cy="13.2" r="0.4" fill="currentColor" />
      <path d="M11 6.5 Q12 5.7 13 6.5" />
    </>
  ),
  salz: () => (
    // Salt shaker: flared cap with three sprinkle holes, slightly bulged
    // body, label band, and a few stray grains escaping above the cap so
    // it reads as "sprinkling" rather than "container".
    <>
      <path d="M9 5.5 Q12 5 15 5.5 V8 H9 Z" />
      <path d="M9 8 Q8 8.5 8.5 10 V20 Q8.5 21 9.5 21 H14.5 Q15.5 21 15.5 20 V10 Q16 8.5 15 8" />
      <circle cx="10.5" cy="6.8" r="0.35" fill="currentColor" />
      <circle cx="12" cy="6.5" r="0.35" fill="currentColor" />
      <circle cx="13.5" cy="6.8" r="0.35" fill="currentColor" />
      <path d="M9 13.5 Q12 14 15 13.5" />
      <path d="M9 16.5 Q12 17 15 16.5" />
      <circle cx="11" cy="3.8" r="0.3" fill="currentColor" />
      <circle cx="13" cy="3.5" r="0.3" fill="currentColor" />
      <circle cx="12" cy="2.8" r="0.3" fill="currentColor" />
    </>
  ),
  honig: () => (
    // Honey jar with a rounded lid, a single dripping bead caught at the
    // rim, and a hexagonal honeycomb cell on the label so the category
    // reads even without showing a bee.
    <>
      <path d="M8 7 Q12 6.5 16 7 V9 H8 Z" />
      <path d="M7.5 9 Q7 10 7.5 11 V20 Q7.5 21 8.5 21 H15.5 Q16.5 21 16.5 20 V11 Q17 10 16.5 9" />
      <path d="M12 9 Q11.8 10.5 12 12" />
      <circle cx="12" cy="12.3" r="0.5" fill="currentColor" />
      <path d="M10 14.5 L13 14.5 L14.2 16.2 L13 18 L10 18 L8.8 16.2 Z" />
      <circle cx="11.5" cy="16.2" r="0.25" fill="currentColor" />
    </>
  ),
  schokolade: () => (
    // Chocolate bar with a 2×2 segment grid and a bitten corner on the
    // top-right so the shape doesn't read as a brick. A few cocoa specks
    // inside the segments add texture without crowding.
    <>
      <path d="M5 8 H17 Q19 8 19 10 V17 Q19 18 18 18 H5 Q4 18 4 17 V9 Q4 8 5 8 Z" />
      <path d="M19 10 Q17 11 16 12 Q15 13 15 14 Q15 15 14 16 Q13 17 12 17 Q11 17 10 17" />
      <path d="M4 13 H15" />
      <path d="M9 8 V13" />
      <path d="M14 8 V13" />
      <path d="M8.5 13 V18" />
      <path d="M13 13 V17" />
      <circle cx="6.5" cy="10.5" r="0.3" fill="currentColor" />
      <circle cx="11.5" cy="10.5" r="0.3" fill="currentColor" />
      <circle cx="6.5" cy="15.5" r="0.3" fill="currentColor" />
    </>
  ),
  seife: () => (
    // Rounded soap bar with three floating bubbles drifting up off the
    // top edge. A single sheen-streak on the bar surface, plus a tiny
    // highlight on the largest bubble.
    <>
      <path d="M5 14 Q5 10.5 12 10 Q19 10.5 19 14 Q19 17.5 12 18 Q5 17.5 5 14 Z" />
      <path d="M7 13 Q9 12.2 12 12.5 Q15 12.8 17 13.5" />
      <circle cx="8.5" cy="7" r="1.3" />
      <circle cx="13" cy="5.5" r="1" />
      <circle cx="10.5" cy="4" r="0.7" />
      <path d="M8 7 Q8.2 6.7 8.5 6.7" />
    </>
  ),
  sprayflasche: () => (
    // Spray bottle: stepped trigger-head on the top, tapered shoulders
    // into the body, label band, and three escaping mist dots shooting
    // out of the nozzle to the upper right.
    <>
      <path d="M9 4 H14 V6 H16 V8 H14 V9" />
      <path d="M9 4 V7 L7.5 9 V20 Q7.5 21 8.5 21 H14.5 Q15.5 21 15.5 20 V9 L14 7 V6" />
      <path d="M7.5 13 Q12 14 15.5 13" />
      <path d="M7.5 17 Q12 18 15.5 17" />
      <circle cx="18" cy="7" r="0.4" fill="currentColor" />
      <circle cx="19.5" cy="5.5" r="0.4" fill="currentColor" />
      <circle cx="19" cy="8.5" r="0.3" fill="currentColor" />
    </>
  ),
  babyflasche: () => (
    // Baby bottle: rounded nipple on top, collar ring under it, body with
    // four measurement dashes on the side and a little smile etched on
    // the lower half so the icon feels friendly rather than clinical.
    <>
      <path d="M10.5 3 Q12 2 13.5 3 Q14 4 13.5 5 H10.5 Q10 4 10.5 3 Z" />
      <path d="M9.5 5 H14.5 V7 H9.5 Z" />
      <path d="M9 7 Q8 7.5 8 9 V19 Q8 21 10 21 H14 Q16 21 16 19 V9 Q16 7.5 15 7" />
      <path d="M9 11 H10.5" />
      <path d="M9 13.5 H11" />
      <path d="M9 16 H10.5" />
      <path d="M9 18.5 H11" />
      <path d="M11.5 17.5 Q12.5 18.2 13.5 17.5" />
      <circle cx="11.5" cy="15.5" r="0.3" fill="currentColor" />
      <circle cx="13.5" cy="15.5" r="0.3" fill="currentColor" />
    </>
  ),
};

export function hasDoodleIcon(name: string): boolean {
  return name in DOODLE_ICONS;
}
