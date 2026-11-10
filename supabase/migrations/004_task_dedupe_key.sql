alter table public.tasks
  add column if not exists dedupe_key text;

create unique index if not exists tasks_dedupe_key_uidx
  on public.tasks (dedupe_key)
  where dedupe_key is not null;

