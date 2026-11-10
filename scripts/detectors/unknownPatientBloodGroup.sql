-- Requests with unknown or null patient blood group.
select request_id, urgency
from public.requests
where lower(patient_blood_group) = 'unknown'
   or patient_blood_group is null
order by request_id;

