import { describe, expect, it } from 'vitest';
import {
  resolveGeneric,
  searchGenerics,
  rootGeneric,
  variantsOf,
  brandKeyForGeneric,
  iconForGeneric,
} from './generics';

describe('resolveGeneric', () => {
  it('maps the bare umbrella term', () => {
    expect(resolveGeneric('Joghurt')).toBe('joghurt');
    expect(resolveGeneric('Milch')).toBe('milch');
    expect(resolveGeneric('Quark')).toBe('quark');
  });

  it('resolves English + shorthand aliases', () => {
    expect(resolveGeneric('yoghurt')).toBe('joghurt');
    expect(resolveGeneric('greek yoghurt')).toBe('griechischer-joghurt');
    expect(resolveGeneric('spq')).toBe('speisequark');
    expect(resolveGeneric('Klopapier')).toBe('toilettenpapier');
  });

  it('picks the fat-content / variant the user typed', () => {
    expect(resolveGeneric('spq 20%')).toBe('speisequark-20');
    expect(resolveGeneric('SPQ 40')).toBe('speisequark-40');
    expect(resolveGeneric('Speisequark Magerstufe')).toBe('speisequark-magerstufe');
    expect(resolveGeneric('Speisequark 20%')).toBe('speisequark-20');
  });

  it('prefers the most specific match inside a verbose product name', () => {
    expect(resolveGeneric('Landliebe Griechischer Joghurt')).toBe('griechischer-joghurt');
    expect(resolveGeneric('Landliebe Joghurt')).toBe('joghurt');
    expect(resolveGeneric('Joghurt laktosefrei')).toBe('joghurt-laktosefrei');
  });

  it('handles hyphen + diacritic normalisation', () => {
    expect(resolveGeneric('H-Milch')).toBe('h-milch');
    expect(resolveGeneric('Toastbrot')).toBe('toast');
  });

  it('returns null for names with no generic', () => {
    expect(resolveGeneric('Bananen')).toBeNull();
    expect(resolveGeneric('')).toBeNull();
  });
});

describe('hierarchy', () => {
  it('walks to the root ancestor', () => {
    expect(rootGeneric('speisequark-20')?.id).toBe('quark');
    expect(rootGeneric('griechischer-joghurt')?.id).toBe('joghurt');
    expect(rootGeneric('joghurt')?.id).toBe('joghurt');
  });

  it('lists transitive variants', () => {
    const ids = variantsOf('quark').map((g) => g.id);
    expect(ids).toEqual(
      expect.arrayContaining(['speisequark', 'speisequark-magerstufe', 'speisequark-20', 'speisequark-40']),
    );
  });

  it('inherits brandKey + icon from ancestors', () => {
    expect(brandKeyForGeneric('griechischer-joghurt')).toBe('joghurt');
    expect(brandKeyForGeneric('speisequark-20')).toBe('quark');
    expect(iconForGeneric('skyr')).toBe('joghurt');
    expect(iconForGeneric('griechischer-joghurt')).toBe('joghurt');
  });
});

describe('searchGenerics', () => {
  it('surfaces the umbrella plus its variants', () => {
    const ids = searchGenerics('quark', 20).map((g) => g.id);
    expect(ids).toContain('quark');
    expect(ids).toEqual(
      expect.arrayContaining(['speisequark', 'speisequark-20', 'speisequark-40']),
    );
  });

  it('ranks the exact match first', () => {
    expect(searchGenerics('joghurt', 20)[0]?.id).toBe('joghurt');
  });
});
