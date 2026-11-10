-- Detect blood units with invalid or malformed ISBT 128 / national format identifiers
select
  unit_id,
  blood_group,
  donation_id
from public.units
where unit_id is null
   or unit_id !~ '^(U[0-9]{4}-[A-Z0-9]{3,4}-[0-9]{6}-(RBC|WB|PLT|FFP|CRYO)|[A-Z0-9]{5}[0-9]{8})$'
order by unit_id;

