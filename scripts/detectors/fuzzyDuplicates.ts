import type { Pool } from 'pg';
import type { CountryConfig, Finding } from '@workbench/shared';
import { birthDateScore, stringSimilarity } from '../lib/fuzzy.js';

interface DonorCandidateRow {
  donor_id: string;
  birth_date: string;
  home_county: string;
  phone_last4: string;
  sex: string;
}

export async function run(pool: Pool, config: CountryConfig): Promise<Finding[]> {
  const threshold = config.fuzzyDuplicates?.threshold ?? 0.8;
  const weights = {
    weightBirthDate: config.fuzzyDuplicates?.weightBirthDate ?? 0.5,
    weightCounty: config.fuzzyDuplicates?.weightCounty ?? 0.3,
    weightPhone: config.fuzzyDuplicates?.weightPhone ?? 0.2,
  };

  // Candidate generation: Group by phone_last4 and sex
  const result = await pool.query<DonorCandidateRow>(`
    select
      donor_id,
      birth_date::text as birth_date,
      home_county,
      phone_last4,
      sex
    from public.donors
    where phone_last4 is not null
      and sex is not null
    order by phone_last4, sex, donor_id;
  `);

  // Group candidates in-memory
  const groups = new Map<string, DonorCandidateRow[]>();
  for (const row of result.rows) {
    const key = `${row.phone_last4}|${row.sex}`;
    let list = groups.get(key);
    if (!list) {
      list = [];
      groups.set(key, list);
    }
    list.push(row);
  }

  const findings: Finding[] = [];

  for (const group of groups.values()) {
    if (group.length < 2) continue;

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];

        const ds = birthDateScore(a.birth_date, b.birth_date);
        const cs = stringSimilarity(a.home_county, b.home_county);
        const ps = a.phone_last4 === b.phone_last4 ? 1.0 : 0.0;

        const compositeScore =
          weights.weightBirthDate * ds +
          weights.weightCounty * cs +
          weights.weightPhone * ps;

        const roundedScore = Math.round(compositeScore * 100) / 100;

        if (compositeScore > threshold) {
          const matchedFields: string[] = ['sex', 'phone_last4'];
          if (ds >= 0.9) {
            matchedFields.push('birth_date');
          } else if (ds > 0) {
            matchedFields.push('birth_date_approx');
          }
          if (cs >= 0.8) {
            matchedFields.push('home_county');
          }

          const sortedIds = [a.donor_id, b.donor_id].sort();

          findings.push({
            type: 'duplicate_donor',
            recordIds: sortedIds,
            suggestion: {
              action: 'review_merge',
              score: roundedScore,
              matched_fields: matchedFields,
            },
            reason: `AI similarity score of ${roundedScore.toFixed(2)} indicates donors ${sortedIds[0]} and ${sortedIds[1]} are likely duplicates based on matching ${matchedFields.join(', ')}.`,
            confidence: roundedScore,
            source: 'ai',
            dedupeKey: `duplicate_donor:${sortedIds[0]}:${sortedIds[1]}`,
          });
        }
      }
    }
  }

  return findings;
}

