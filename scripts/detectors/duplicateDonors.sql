-- Sensible heuristic baseline: donors grouped by sex, home_county, and phone_last4.
select
  sex,
  home_county,
  phone_last4,
  array_agg(donor_id order by registration_date asc, donor_id asc) as donor_ids,
  count(*) as group_size
from public.donors
where sex is not null
  and home_county is not null
  and phone_last4 is not null
group by sex, home_county, phone_last4
having count(*) > 1
order by sex, home_county, phone_last4;
