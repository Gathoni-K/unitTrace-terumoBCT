import type { Pool } from 'pg';
import type { CountryConfig, Finding } from '@workbench/shared';

interface RequestRow {
  request_id: string;
  urgency: string;
}

export async function run(pool: Pool, config: CountryConfig): Promise<Finding[]> {
  void config;

  const result = await pool.query<RequestRow>(`
    select request_id, urgency
    from public.requests
    where lower(patient_blood_group) = 'unknown'
       or patient_blood_group is null
    order by request_id;
  `);

  return result.rows.map((row): Finding => ({
    type: 'unknown_patient_blood_group',
    recordIds: [row.request_id],
    suggestion: { action: 'verify_patient_blood_group', requestId: row.request_id },
    reason: `Request ${row.request_id} records an unknown patient blood group. Compatibility cannot be verified.`,
    confidence: 'rule',
    source: 'rule',
    dedupeKey: `unknown_patient_blood_group:${row.request_id}`,
  }));
}

