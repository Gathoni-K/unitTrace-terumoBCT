import type { Pool } from 'pg';
import type { CountryConfig, Finding } from '@workbench/shared';

// Sensible heuristic baseline: group donors by sex, home_county, and phone_last4.
// This represents what a realistic human clerk would match deterministically without AI.
// This is the baseline against which the fuzzy matcher is compared.

interface DonorGroupRow {
  sex: string;
  home_county: string;
  phone_last4: string;
  donor_ids: string[];
}

export async function run(pool: Pool, config: CountryConfig): Promise<Finding[]> {
  void config;

  const result = await pool.query<DonorGroupRow>(`
    select
      sex,
      home_county,
      phone_last4,
      array_agg(donor_id order by registration_date asc, donor_id asc) as donor_ids
    from public.donors
    where sex is not null
      and home_county is not null
      and phone_last4 is not null
    group by sex, home_county, phone_last4
    having count(*) > 1
    order by sex, home_county, phone_last4;
  `);

  const findings: Finding[] = [];

  for (const row of result.rows) {
    const ids = row.donor_ids;
    // Emit one finding per unique pair within the group
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const sortedIds = [ids[i], ids[j]].sort();
        findings.push({
          type: 'duplicate_donor',
          recordIds: sortedIds,
          suggestion: { action: 'review_merge', matched_fields: ['sex', 'home_county', 'phone_last4'] },
          reason: `Exact match on sex, home county, and phone last 4 digits.`,
          confidence: 'rule',
          source: 'rule',
          dedupeKey: `duplicate_donor:${sortedIds[0]}:${sortedIds[1]}`,
        });
      }
    }
  }

  return findings;
}
