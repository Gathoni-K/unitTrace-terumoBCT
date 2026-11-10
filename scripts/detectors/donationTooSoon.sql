-- Detect donations occurring before the minimum gendered interval
-- Male threshold: typically 90 days (3 months)
-- Female threshold: typically 120 days (4 months)
with ranked_donations as (
  select
    d.donation_id,
    d.donor_id,
    d.collection_date,
    lag(d.collection_date) over (partition by d.donor_id order by d.collection_date asc, d.donation_id asc) as prev_collection_date,
    dr.sex
  from public.donations d
  join public.donors dr on dr.donor_id = d.donor_id
  where d.outcome = 'collected'
    and dr.sex in ('M', 'F')
)
select
  donation_id,
  donor_id,
  collection_date::text as collection_date,
  prev_collection_date::text as prev_collection_date,
  (collection_date - prev_collection_date)::int as gap_days,
  sex
from ranked_donations
where prev_collection_date is not null
  and (
    (sex = 'M' and (collection_date - prev_collection_date) < $1)
    or
    (sex = 'F' and (collection_date - prev_collection_date) < $2)
  )
order by collection_date asc, donation_id asc;

