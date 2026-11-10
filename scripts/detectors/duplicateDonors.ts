import type { Pool } from 'pg';
import type { CountryConfig, Finding } from '@workbench/shared';

export interface DuplicateDonorRow {
  birth_date: string;
  sex: string;
  home_county: string;
  phone_last4: string;
  group_count: string | number;
  donor_ids: string[];
}

export async function run(pool: Pool, config: CountryConfig): Promise<Finding[]> {
  void config;

  const query = `
    select
      birth_date::text as birth_date,
      sex,
      home_county,
      phone_last4,
      count(*) as group_count,
      array_agg(donor_id order by registration_date asc, donor_id asc) as donor_ids
    from public.donors
    where birth_date is not null
      and sex is not null
      and home_county is not null
      and phone_last4 is not null
    group by birth_date, sex, home_county, phone_last4
    having count(*) > 1
    order by min(registration_date) asc, min(donor_id) asc;
  `;

  const result = await pool.query<DuplicateDonorRow>(query);

  return result.rows.map((row): Finding => {
    const donorIds = row.donor_ids;
    const primaryDonorId = donorIds[0];
    const duplicateDonorIds = donorIds.slice(1);
    const sortedIds = [...donorIds].sort();

    return {
      type: 'duplicate_donor',
      recordIds: donorIds,
      suggestion: {
        action: 'merge_donors',
        primaryDonorId,
        duplicateDonorIds,
      },
      reason: `Found ${donorIds.length} donor records sharing birth date (${row.birth_date}), sex (${row.sex}), home county (${row.home_county}), and phone ending in ${row.phone_last4}.`,
      confidence: 'rule',
      source: 'rule',
      dedupeKey: `duplicate_donor:${sortedIds.join(':')}`,
    };
  });
}
