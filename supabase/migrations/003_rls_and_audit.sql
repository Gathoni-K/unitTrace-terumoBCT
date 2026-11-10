alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.decisions enable row level security;
alter table public.audit_log enable row level security;
alter table public.access_log enable row level security;

create or replace function public.current_role_name()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where user_id = auth.uid();
$$;

-- Authenticated users may read profiles only for their own account.
create policy "users read own profile" on public.profiles
  for select to authenticated using (user_id = auth.uid());
-- Authenticated users may review generated tasks.
create policy "authenticated read tasks" on public.tasks
  for select to authenticated using (true);
-- Authenticated users may review decisions.
create policy "authenticated read decisions" on public.decisions
  for select to authenticated using (true);
-- Audit rows are readable but never directly writable by users.
create policy "authenticated read audit log" on public.audit_log
  for select to authenticated using (true);
-- Access events are readable but only inserted for the caller.
create policy "authenticated read access log" on public.access_log
  for select to authenticated using (true);
create policy "users insert own access events" on public.access_log
  for insert to authenticated with check (user_id = auth.uid());

-- Decisions may be submitted by the caller; supervisor-only actions are checked separately.
create policy "users insert own decisions" on public.decisions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and (action not in ('approve', 'send_back') or public.current_role_name() = 'supervisor')
  );

create or replace function public.apply_decision_and_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_status text;
  next_status text;
begin
  select status into previous_status from public.tasks where task_id = new.task_id for update;
  next_status := previous_status;

  -- TODO: review merge-task workflow once detector task types are finalized.
  if new.action in ('accept', 'change', 'reject') then
    if exists (select 1 from public.tasks where task_id = new.task_id and type = 'facility_name') then
      next_status := 'waiting_supervisor';
    else
      next_status := 'done';
    end if;
  elsif new.action = 'escalate' then
    next_status := 'escalated';
  elsif new.action = 'approve' then
    next_status := 'done';
  elsif new.action = 'send_back' then
    next_status := 'open';
  end if;

  update public.tasks set status = next_status where task_id = new.task_id;
  insert into public.audit_log (user_id, action, task_id, before_value, after_value)
  values (
    new.user_id,
    new.action,
    new.task_id,
    jsonb_build_object('status', previous_status),
    jsonb_build_object('status', next_status)
  );
  return new;
end;
$$;

create trigger decisions_apply_and_audit
after insert on public.decisions
for each row execute function public.apply_decision_and_audit();
