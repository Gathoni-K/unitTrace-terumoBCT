-- Sensor glitch detector query.
-- Query temperature_logs for readings whose temp_c matches any configured glitch value.
-- TODO: Consider a configurable plausible-range rule (e.g. from CountryConfig safeTempRange); do not invent numeric ranges.
select
  facility_id,
  recorded_at::text as recorded_at,
  temp_c
from public.temperature_logs
where temp_c = any($1::numeric[])
order by recorded_at, facility_id;
