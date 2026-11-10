-- Donors missing blood group (NULL or empty string).
select donor_id
from public.donors
where blood_group is null
   or blood_group = ''
order by donor_id;

