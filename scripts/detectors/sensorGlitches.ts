import type { Pool } from 'pg';
import type { CountryConfig, Finding } from '@workbench/shared';

// TODO: Consider a configurable plausible-range rule (e.g. from CountryConfig.safeTempRange); do not invent numeric ranges.

export async function run(pool: Pool, config: CountryConfig): Promise<Finding[]> {
  const glitchValues = config.sensorGlitchValues;
  if (!glitchValues || glitchValues.length === 0) {
    return [];
  }

  const query = `
    select
      facility_id,
      recorded_at::text as recorded_at,
      temp_c
    from public.temperature_logs
    where temp_c = any($1::numeric[])
    order by recorded_at, facility_id;
  `;

  const result = await pool.query<{ facility_id: string; recorded_at: string; temp_c: string | number }>(
    query,
    [glitchValues],
  );

  return result.rows.map((row): Finding => {
    const observedValue = Number(row.temp_c);
    const displayValue = Number.isInteger(observedValue) ? observedValue.toFixed(1) : String(observedValue);
    return {
      type: 'sensor_glitch',
      recordIds: [row.facility_id, row.recorded_at],
      suggestion: {
        action: 'mark_sensor_fault',
        observedValue,
      },
      reason: `A reading of ${displayValue} is not physically possible for a blood fridge. It is likely a sensor fault.`,
      confidence: 'rule',
      source: 'rule',
      dedupeKey: `sensor_glitch:${row.facility_id}:${row.recorded_at}`,
    };
  });
}
