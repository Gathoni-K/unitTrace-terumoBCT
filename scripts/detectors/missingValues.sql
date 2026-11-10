-- Queries for missing value detection across donors, requests, and transfers.

-- 1. Donors missing blood group
select
  donor_id,
  registration_date::text as registration_date,
  registration_site_id
from public.donors
where blood_group is null
order by registration_date asc, donor_id asc;

-- 2. Requests with unknown patient blood group
select
  request_id,
  facility_id,
  requested_at::text as requested_at,
  urgency
from public.requests
where lower(patient_blood_group) = 'unknown'
order by requested_at asc, request_id asc;

-- 3. Transfers without a confirmation of receipt (uses transfers_unreceived_idx)
select
  transfer_id,
  unit_id,
  from_facility_id,
  to_facility_id,
  dispatched_at::text as dispatched_at
from public.transfers
where received_at is null
order by dispatched_at asc, transfer_id asc;
