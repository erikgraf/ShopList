import { describe, expect, it } from 'vitest';
import { resolveMatchKey } from './offer-match';

describe('resolveMatchKey', () => {
  it('collapses tomato variants to one key', () => {
    const k = resolveMatchKey('Tomaten');
    expect(k).toBe('tomaten');
    expect(resolveMatchKey('Cherryrispentomaten 200 g')).toBe('tomaten');
    expect(resolveMatchKey('BESTES AUS DER REGION Rispentomaten')).toBe('tomaten');
  });

  it('resolves Sprudel and Mineralwasser to the same key', () => {
    expect(resolveMatchKey('Sprudel Lieler')).toBe('mineralwasser');
    expect(resolveMatchKey('Mineralwasser Gerolsteiner')).toBe('mineralwasser');
  });

  it("doesn't let a modifier steal a compound's head noun", () => {
    // salat·gurke is a gurke, not a salat
    expect(resolveMatchKey('Salatgurke 1 Stück')).toBe('gurke');
  });

  it('returns null for an unknown product', () => {
    expect(resolveMatchKey('Pickleball Set aus Holz')).toBeNull();
  });

  it('matches concrete butcher offers to a generic item key', () => {
    expect(resolveMatchKey('Schnitzel')).toBe('schnitzel');
    expect(resolveMatchKey('Schnitzelsortiment 500 g, Toskana Art')).toBe('schnitzel');
  });
});

// The two cases the user reported, end-to-end through the matcher.
describe('user-reported matches', () => {
  it('Tomaten ↔ Cherryrispentomaten share a key', () => {
    expect(resolveMatchKey('Tomaten')).toBe(resolveMatchKey('Cherryrispentomaten 200 g'));
  });
  it('Sprudel Lieler ↔ Mineralwasser Gerolsteiner share a key', () => {
    expect(resolveMatchKey('Sprudel Lieler')).toBe(
      resolveMatchKey('Mineralwasser Gerolsteiner 0,75 l'),
    );
  });
});
