import type { Pool } from 'pg';
import type { CountryConfig, Finding } from '@workbench/shared';

interface UnitRow {
  unit_id: string;
  blood_group?: string | null;
  donation_id?: string | null;
}

export async function run(pool: Pool, config: CountryConfig): Promise<Finding[]> {
  const pattern =
    config.isbt128Regex ??
    '^(U[0-9]{4}-[A-Z0-9]{3,4}-[0-9]{6}-(RBC|WB|PLT|FFP|CRYO)|[A-Z0-9]{5}\\s?[0-9]{2}\\s?[0-9]{6})$';
  const regex = new RegExp(pattern);

  const result = await pool.query<UnitRow>(`
    select unit_id, blood_group, donation_id
    from public.units
    order by unit_id;
  `);

  const malformed = result.rows.filter((row) => !row.unit_id || !regex.test(row.unit_id));

  return malformed.map((row): Finding => ({
    type: 'invalid_isbt128',
    recordIds: [row.unit_id],
    suggestion: {
      action: 'relabel_or_verify_isbt128',
      unitId: row.unit_id,
      standard: 'ISBT 128 / National Blood Barcode Standard',
    },
    reason: `Unit ${row.unit_id} does not conform to the ISBT 128 identification standard. This format error blocks cross-facility tracking.`,
    confidence: 'rule',
    source: 'rule',
    dedupeKey: `invalid_isbt128:${row.unit_id}`,
  }));
}

