-- AI Fuzzy Matching: Candidate pair generation by phone_last4 and sex.
-- Pairs are then scored using composite date and string similarity in Node.
select
  donor_id,
  birth_date::text as birth_date,
  home_county,
  phone_last4,
  sex
from public.donors
where phone_last4 is not null
  and sex is not null
order by phone_last4, sex, donor_id;

