export interface TableCountCheck {
  table: string;
  actual: number;
  expected: number;
  diff: number;
  percentDiff: number;
  passes: boolean;
}

export interface CountComparisonReport {
  results: TableCountCheck[];
  allPassed: boolean;
}

export function compareRowCount(
  actual: number,
  expected: number,
  thresholdPercent = 1.0,
): {
  diff: number;
  percentDiff: number;
  passes: boolean;
} {
  const diff = actual - expected;
  const percentDiff = expected === 0 ? (actual === 0 ? 0 : 100) : (Math.abs(diff) / expected) * 100;
  const passes = percentDiff <= thresholdPercent;
  return { diff, percentDiff, passes };
}

export function evaluateRowCounts(
  actualCounts: Record<string, number>,
  expectedCounts: Record<string, number>,
  thresholdPercent = 1.0,
): CountComparisonReport {
  const results: TableCountCheck[] = [];
  let allPassed = true;

  for (const [table, expected] of Object.entries(expectedCounts)) {
    const actual = actualCounts[table] ?? 0;
    const { diff, percentDiff, passes } = compareRowCount(actual, expected, thresholdPercent);
    if (!passes) {
      allPassed = false;
    }
    results.push({
      table,
      actual,
      expected,
      diff,
      percentDiff,
      passes,
    });
  }

  return { results, allPassed };
}

