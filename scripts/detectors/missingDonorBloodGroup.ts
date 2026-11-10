import type { Pool } from 'pg';
import type { CountryConfig, Finding } from '@workbench/shared';

interface DonorRow {
  donor_id: string;
}

export async function run(pool: Pool, config: CountryConfig): Promise<Finding[]> {
  void config;

  const result = await pool.query<DonorRow>(`
    select donor_id
    from public.donors
    where blood_group is null
       or blood_group = ''
    order by donor_id;
  `);

  return result.rows.map((row): Finding => ({
    type: 'missing_donor_blood_group',
    recordIds: [row.donor_id],
    suggestion: { action: 'request_confirmatory_typing', donorId: row.donor_id },
    reason: `Donor ${row.donor_id} has no recorded blood group. This blocks safe matching to requests and units.`,
    confidence: 'rule',
    source: 'rule',
    dedupeKey: `missing_donor_blood_group:${row.donor_id}`,
  }));
}

