/** Levenshtein edit distance between two strings (pure, no deps). */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let curr = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const next = Math.min(prev[j] + 1, curr + 1, prev[j - 1] + cost);
      prev[j - 1] = curr;
      curr = next;
    }
    prev[b.length] = curr;
  }
  return prev[b.length];
}

/** Normalised similarity: 1.0 = identical, 0.0 = completely different. */
export function stringSimilarity(a: string, b: string): number {
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  if (na === nb) return 1.0;
  const maxLen = Math.max(na.length, nb.length);
  if (maxLen === 0) return 1.0;
  return 1 - levenshtein(na, nb) / maxLen;
}

/** Score the birth_date component of a fuzzy comparison (days apart). */
export function birthDateScore(a: string, b: string): number {
  if (!a || !b) return 0;
  const msPerDay = 86400000;
  const diff = Math.abs(new Date(a).getTime() - new Date(b).getTime()) / msPerDay;
  if (Number.isNaN(diff)) return 0;
  if (diff === 0) return 1.0;
  if (diff <= 1) return 0.9;
  if (diff <= 30) return 0.5;
  return 0;
}

export interface FuzzyWeights {
  weightBirthDate: number;
  weightCounty: number;
  weightPhone: number;
}

/**
 * Composite fuzzy score for a donor pair.
 * phone_last4 exact match is baked in because candidate generation already
 * groups by phone_last4; this column contributes its weight at score 1.0.
 */
export function compositeFuzzyScore(
  a: { birth_date: string; home_county: string },
  b: { birth_date: string; home_county: string },
  weights: FuzzyWeights,
): number {
  const ds = birthDateScore(a.birth_date, b.birth_date);
  const cs = stringSimilarity(a.home_county, b.home_county);
  // phone_last4 is always 1.0 — groups are pre-filtered by exact phone_last4 & sex
  return weights.weightBirthDate * ds + weights.weightCounty * cs + weights.weightPhone * 1.0;
}

