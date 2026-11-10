-- Duplicate donor detector query.
-- Finds groups of donor records sharing exact birth_date, sex, home_county, and phone_last4.
-- Groups are ordered with the earliest registered donor first.
select
  birth_date::text as birth_date,
  sex,
  home_county,
  phone_last4,
  count(*) as group_count,
  array_agg(donor_id order by registration_date asc, donor_id asc) as donor_ids
from public.donors
where birth_date is not null
  and sex is not null
  and home_county is not null
  and phone_last4 is not null
group by birth_date, sex, home_county, phone_last4
having count(*) > 1
order by min(registration_date) asc, min(donor_id) asc;
