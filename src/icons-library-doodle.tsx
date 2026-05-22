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
};

export function hasDoodleIcon(name: string): boolean {
  return name in DOODLE_ICONS;
}
