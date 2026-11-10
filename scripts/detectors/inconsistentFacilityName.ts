import type { Pool } from 'pg';
import type { CountryConfig, Finding } from '@workbench/shared';

interface InconsistentFacilityRow {
  request_id: string;
  facility_id: string;
  facility_name_raw: string;
  canonical_name: string;
}

export async function run(pool: Pool, config: CountryConfig): Promise<Finding[]> {
  void config;

  const result = await pool.query<InconsistentFacilityRow>(`
    select
      r.request_id,
      r.facility_id,
      r.facility_name_raw,
      f.name as canonical_name
    from public.requests r
    join public.facilities f on r.facility_id = f.facility_id
    where r.facility_name_raw is not null
      and lower(trim(r.facility_name_raw)) != lower(trim(f.name))
    order by r.request_id;
  `);

  return result.rows.map((row): Finding => ({
    type: 'implausible',
    recordIds: [row.request_id],
    suggestion: {
      action: 'fix_facility_name',
      suggested_facility_id: row.facility_id,
      expected_name: row.canonical_name,
    },
    reason: `Facility name '${row.facility_name_raw}' does not match the canonical facility registry '${row.canonical_name}'. This breaks DHIS2 aggregation.`,
    confidence: 'rule',
    source: 'rule',
    dedupeKey: `inconsistent_facility_name:${row.request_id}`,
  }));
}
