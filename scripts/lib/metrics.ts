export interface MetricsResult {
  tp: number;
  fp: number;
  fn: number;
  precision: number;
  recall: number;
  f1: number;
}

export function calculateMetrics(
  predictedPairs: Iterable<string>,
  groundTruthPairs: Iterable<string>,
): MetricsResult {
  const predictedSet = new Set(predictedPairs);
  const truthSet = new Set(groundTruthPairs);

  let tp = 0;
  let fp = 0;

  for (const pair of predictedSet) {
    if (truthSet.has(pair)) {
      tp++;
    } else {
      fp++;
    }
  }

  const fn = truthSet.size - tp;

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  return {
    tp,
    fp,
    fn,
    precision,
    recall,
    f1,
  };
}

