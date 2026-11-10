import { describe, expect, it } from 'vitest';
import { compareRowCount, evaluateRowCounts } from './counts.js';

describe('counts helper', () => {
  it('passes when count exactly matches expected', () => {
    const res = compareRowCount(43363, 43363);
    expect(res.passes).toBe(true);
    expect(res.diff).toBe(0);
    expect(res.percentDiff).toBe(0);
  });

  it('passes within 1 percent difference', () => {
    // 43363 * 0.005 = ~216
    const res = compareRowCount(43400, 43363);
    expect(res.passes).toBe(true);
    expect(res.diff).toBe(37);
    expect(res.percentDiff).toBeLessThan(1.0);
  });

  it('fails when difference exceeds 1 percent', () => {
    // 47 expected, 40 actual: (7 / 47) * 100 = 14.89%
    const res = compareRowCount(40, 47);
    expect(res.passes).toBe(false);
    expect(res.diff).toBe(-7);
    expect(res.percentDiff).toBeGreaterThan(1.0);
  });

  it('evaluates multiple tables correctly and sets allPassed', () => {
    const expected = {
      donors: 43363,
      facilities: 47,
    };
    const passingActual = {
      donors: 43363,
      facilities: 47,
    };
    const passingReport = evaluateRowCounts(passingActual, expected);
    expect(passingReport.allPassed).toBe(true);
    expect(passingReport.results).toHaveLength(2);

    const failingActual = {
      donors: 43363,
      facilities: 10,
    };
    const failingReport = evaluateRowCounts(failingActual, expected);
    expect(failingReport.allPassed).toBe(false);
  });
});

