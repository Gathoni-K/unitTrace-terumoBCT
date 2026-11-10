import type { Pool } from 'pg';
import type { CountryConfig, Finding } from '@workbench/shared';

interface LoggerGapRow {
  facility_id: string;
  gap_start_iso: string;
  gap_end_iso: string;
  gap_hours: number | string;
}

export async function run(pool: Pool, config: CountryConfig): Promise<Finding[]> {
  const gapHoursThreshold = config.fuzzyDuplicates?.loggerGapHours ?? 6;

  const query = `
    with ranked_readings as (
      select
        facility_id,
        recorded_at,
        lag(recorded_at) over (partition by facility_id order by recorded_at asc) as prev_recorded_at
      from public.temperature_logs
    )
    select
      facility_id,
      to_char(prev_recorded_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as gap_start_iso,
      to_char(recorded_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') as gap_end_iso,
      round(extract(epoch from (recorded_at - prev_recorded_at)) / 3600.0, 1) as gap_hours
    from ranked_readings
    where prev_recorded_at is not null
      and extract(epoch from (recorded_at - prev_recorded_at)) > ($1 * 3600)
    order by facility_id asc, gap_start_iso asc;
  `;

  const result = await pool.query<LoggerGapRow>(query, [gapHoursThreshold]);

  return result.rows.map((row): Finding => {
    const hours = Number(row.gap_hours);
    return {
      type: 'logger_gap',
      recordIds: [row.facility_id],
      suggestion: {
        action: 'inspect_logger_connectivity',
        facilityId: row.facility_id,
        gapHours: hours,
        gapStart: row.gap_start_iso,
        gapEnd: row.gap_end_iso,
      },
      reason: `Temperature logger at facility ${row.facility_id} dropped out for ${hours} hours between ${row.gap_start_iso} and ${row.gap_end_iso}, exceeding the ${gapHoursThreshold}h threshold.`,
      confidence: 'rule',
      source: 'rule',
      dedupeKey: `logger_gap:${row.facility_id}:${row.gap_start_iso}:${row.gap_end_iso}`,
    };
  });
}
