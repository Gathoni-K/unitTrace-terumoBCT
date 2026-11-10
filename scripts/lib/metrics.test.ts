import { describe, expect, it } from 'vitest';
import { calculateMetrics } from './metrics.js';

describe('calculateMetrics', () => {
  it('computes precision, recall, and F1 accurately', () => {
    const truth = ['A:B', 'C:D', 'E:F'];
    const predicted = ['A:B', 'C:D', 'G:H']; // 2 TP, 1 FP, 1 FN

    const m = calculateMetrics(predicted, truth);
    expect(m.tp).toBe(2);
    expect(m.fp).toBe(1);
    expect(m.fn).toBe(1);
    expect(m.precision).toBeCloseTo(2 / 3);
    expect(m.recall).toBeCloseTo(2 / 3);
    expect(m.f1).toBeCloseTo(2 / 3);
  });

  it('handles empty predictions safely', () => {
    const truth = ['A:B'];
    const m = calculateMetrics([], truth);
    expect(m.tp).toBe(0);
    expect(m.precision).toBe(0);
    expect(m.recall).toBe(0);
    expect(m.f1).toBe(0);
  });
});

