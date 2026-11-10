create extension if not exists pg_trgm;

create table public.donors (
  donor_id text primary key,
  sex text,
  birth_date date,
  blood_group text,
  home_county text,
  registration_date date,
  registration_site_id text,
  phone_last4 text
);

create table public.requests (
  request_id text primary key,
  facility_id text,
  facility_name_raw text,
  requested_at timestamp without time zone,
  urgency text,
  patient_blood_group text
);

create table public.transfers (
  transfer_id text primary key,
  unit_id text,
  from_facility_id text,
  to_facility_id text,
  dispatched_at timestamp without time zone,
  received_at timestamp without time zone
);

create table public.temperature_logs (
  facility_id text,
  recorded_at timestamp without time zone,
  temp_c numeric,
  primary key (facility_id, recorded_at)
);

create table public.facilities (
  facility_id text primary key,
  name text,
  county text,
  connectivity text,
  grid_reliability numeric
);

create table public.donations (
  donation_id text primary key,
  donor_id text,
  collection_date date,
  outcome text
);

create table public.units (
  unit_id text primary key,
  donation_id text,
  blood_group text
);

create index donors_detector_idx on public.donors (birth_date, sex, home_county, phone_last4);
create index requests_facility_idx on public.requests (facility_id);
create index transfers_unreceived_idx on public.transfers (received_at) where received_at is null;
create index temperature_logs_detector_idx on public.temperature_logs (facility_id, recorded_at);
create index facilities_name_trgm_idx on public.facilities using gin (name gin_trgm_ops);

do $$
declare
  table_name text;
begin
  foreach table_name in array array['donors', 'requests', 'transfers', 'temperature_logs', 'facilities', 'donations', 'units']
  loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy "%s authenticated read only" on public.%I for select to authenticated using (true)', table_name, table_name);
  end loop;
end $$;
