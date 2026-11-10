-- Naive baseline: donors grouped by phone_last4 only. High recall, low precision.
select
  phone_last4,
  array_agg(donor_id order by registration_date asc, donor_id asc) as donor_ids,
  count(*) as group_size
from public.donors
where phone_last4 is not null
group by phone_last4
having count(*) > 1
order by phone_last4;
