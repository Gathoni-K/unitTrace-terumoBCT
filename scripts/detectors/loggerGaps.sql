-- Detect temperature logger dropout gaps exceeding the threshold in hours ($1)
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
