-- Exploratory read-only queries on temperature_logs for manual inspection.
-- Run these queries directly against the database (e.g. via psql or Supabase SQL Editor).

-- 1. Overall min and max of temp_c across all temperature logs
select
  min(temp_c) as min_temp_c,
  max(temp_c) as max_temp_c,
  count(*) as total_readings,
  count(*) filter (where temp_c is null) as null_count
from public.temperature_logs;

-- 2. Counts of specific known candidate glitch values (0.0, -99.0, 99.9)
select
  temp_c,
  count(*) as count
from public.temperature_logs
where temp_c in (0.0, -99.0, 99.9)
group by temp_c
order by temp_c;

-- 3. Distinct temp_c values strictly below 0 or strictly above 30 with counts
select
  temp_c,
  count(*) as count
from public.temperature_logs
where temp_c < 0 or temp_c > 30
group by temp_c
order by temp_c;

-- 4. Glitch readings (-99.0, 0.0, 99.9) grouped by facility
select
  facility_id,
  temp_c,
  count(*) as count
from public.temperature_logs
where temp_c in (-99.0, 0.0, 99.9)
group by facility_id, temp_c
order by facility_id, temp_c;

-- 5. Out-of-safe-range readings outside [2, 6] deg C (excluding extreme glitches)
-- Useful for inspecting whether other implausible values or temperature excursions exist
select
  temp_c,
  count(*) as count
from public.temperature_logs
where (temp_c < 2 or temp_c > 6)
  and temp_c not in (-99.0, 0.0, 99.9)
group by temp_c
order by temp_c;

