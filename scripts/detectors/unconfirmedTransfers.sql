-- Transfers where the receiving facility never confirmed receipt.
-- Uses the transfers_unreceived_idx partial index on received_at IS NULL.
select transfer_id, to_facility_id, dispatched_at::text as dispatched_at
from public.transfers
where received_at is null
order by dispatched_at, transfer_id;

