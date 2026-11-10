-- Detect facility names in requests that do not match the canonical facility registry (breaks DHIS2 aggregation).
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

