import type { Pool } from 'pg';
import type { CountryConfig, Finding } from '@workbench/shared';

// Naive baseline: group donors by phone_last4 only and emit a finding for every
// pair. This maximises recall (100%) at the cost of very low precision because
// many unrelated donors share the last 4 digits of a phone number.
// This is the baseline against which the fuzzy matcher is compared.

interface DonorPhoneRow {
  phone_last4: string;
  donor_ids: string[];
}

export async function run(pool: Pool, config: CountryConfig): Promise<Finding[]> {
  void config;

  const result = await pool.query<DonorPhoneRow>(`
    select
      phone_last4,
      array_agg(donor_id order by registration_date asc, donor_id asc) as donor_ids
    from public.donors
    where phone_last4 is not null
    group by phone_last4
    having count(*) > 1
    order by phone_last4;
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
          suggestion: { action: 'review_merge', matched_fields: ['phone_last4'] },
          reason: `Donors ${sortedIds[0]} and ${sortedIds[1]} share the same phone last 4 digits (${row.phone_last4}).`,
          confidence: 'rule',
          source: 'rule',
          dedupeKey: `duplicate_donor:${sortedIds[0]}:${sortedIds[1]}`,
        });
      }
    }
  }

  return findings;
}
