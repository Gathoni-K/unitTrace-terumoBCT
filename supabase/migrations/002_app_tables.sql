-- Allowed values mirror the single-source constants in packages/shared/src/index.ts.
create table public.profiles (
  user_id uuid primary key references auth.users,
  role text check (role in ('clerk', 'supervisor')),
  display_name text
);

create table public.tasks (
  task_id bigint generated always as identity primary key,
  type text,
  record_ids jsonb,
  suggestion jsonb,
  reason text,
  confidence text check (confidence in ('high', 'medium', 'low', 'rule')),
  source text check (source in ('rule', 'smart')),
  status text default 'open' check (status in ('open', 'waiting_supervisor', 'done', 'escalated')),
  assigned_to uuid null,
  created_at timestamptz default now()
);

create table public.decisions (
  decision_id bigint generated always as identity primary key,
  task_id bigint references public.tasks,
  user_id uuid references auth.users,
  role text,
  action text check (action in ('accept', 'change', 'reject', 'approve', 'send_back', 'escalate')),
  note text,
  channel text check (channel in ('web', 'offline_sync', 'sms', 'ussd')),
  decided_at timestamptz default now(),
  synced_later boolean default false
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz default now(),
  user_id uuid,
  action text,
  task_id bigint,
  before_value jsonb,
  after_value jsonb
);

create table public.access_log (
  id bigint generated always as identity primary key,
  at timestamptz default now(),
  user_id uuid,
  event text,
  record_type text,
  record_id text
);
