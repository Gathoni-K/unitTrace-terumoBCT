import { describe, expect, it } from 'vitest';
import { stringSimilarity, birthDateScore, compositeFuzzyScore } from './fuzzy.js';

describe('stringSimilarity', () => {
  it('returns 1.0 for identical strings', () => {
    expect(stringSimilarity('Nairobi', 'Nairobi')).toBe(1.0);
  });
  it('is case-insensitive', () => {
    expect(stringSimilarity('NAIROBI', 'nairobi')).toBe(1.0);
  });
  it('returns <1 for different strings', () => {
    expect(stringSimilarity('Nairobi', 'Mombasa')).toBeLessThan(1.0);
  });
  it('handles trailing whitespace', () => {
    expect(stringSimilarity('Nairobi ', 'Nairobi')).toBe(1.0);
  });
  it('returns 0.0 for completely unrelated strings of same length', () => {
    const s = stringSimilarity('aaa', 'bbb');
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThan(0.5);
  });
});

describe('birthDateScore', () => {
  it('returns 1.0 for identical dates', () => {
    expect(birthDateScore('2000-01-01', '2000-01-01')).toBe(1.0);
  });
  it('returns 0.9 for dates 1 day apart', () => {
    expect(birthDateScore('2000-01-01', '2000-01-02')).toBe(0.9);
  });
  it('returns 0.5 for dates within 30 days', () => {
    expect(birthDateScore('2000-01-01', '2000-01-20')).toBe(0.5);
  });
  it('returns 0 for dates more than 30 days apart', () => {
    expect(birthDateScore('2000-01-01', '2000-05-01')).toBe(0);
  });
  it('returns 0 for empty strings', () => {
    expect(birthDateScore('', '2000-01-01')).toBe(0);
  });
});

describe('compositeFuzzyScore', () => {
  const weights = { weightBirthDate: 0.5, weightCounty: 0.3, weightPhone: 0.2 };

  it('returns 1.0 for identical donors', () => {
    const d = { birth_date: '1990-06-15', home_county: 'Nairobi' };
    expect(compositeFuzzyScore(d, d, weights)).toBeCloseTo(1.0);
  });

  it('returns >0.8 for planted duplicate scenario (same date, same county)', () => {
    const a = { birth_date: '1990-06-15', home_county: 'Machakos' };
    const b = { birth_date: '1990-06-15', home_county: 'Machakos' };
    expect(compositeFuzzyScore(a, b, weights)).toBeGreaterThan(0.8);
  });

  it('returns <0.8 for different birth date and different county', () => {
    const a = { birth_date: '1990-06-15', home_county: 'Nairobi' };
    const b = { birth_date: '1985-01-01', home_county: 'Turkana' };
    expect(compositeFuzzyScore(a, b, weights)).toBeLessThan(0.8);
  });
});

