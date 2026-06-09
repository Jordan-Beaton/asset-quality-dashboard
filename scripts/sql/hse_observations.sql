create table if not exists public.hse_observations (
  id uuid primary key default gen_random_uuid(),
  observation_number text not null unique,
  reporter_type text not null default 'Quick Fill',
  reporter_name text,
  reporter_company text,
  reporter_contact text,
  project text,
  site_location text,
  observation_date date not null default current_date,
  observation_time text,
  observation_type text not null default 'Observation',
  category text,
  risk_level text,
  title text,
  description text not null,
  immediate_action text,
  suggested_action text,
  status text not null default 'New',
  assigned_to text,
  closed_at timestamptz,
  closed_by text,
  closeout_notes text,
  source_qr text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.hse_observation_number_seq;

do $$
declare
  max_observation_number integer;
begin
  select coalesce(max((regexp_match(observation_number, '^OBS\s*-\s*(\d+)\s*$'))[1]::integer), 0)
  into max_observation_number
  from public.hse_observations
  where observation_number ~* '^OBS\s*-\s*\d+\s*$';

  if max_observation_number > 0 then
    perform setval('public.hse_observation_number_seq', max_observation_number, true);
  else
    perform setval('public.hse_observation_number_seq', 1, false);
  end if;
end $$;

create or replace function public.next_hse_observation_number()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  next_number bigint;
begin
  next_number := nextval('public.hse_observation_number_seq');
  return 'OBS-' || lpad(next_number::text, 3, '0');
end;
$$;

create table if not exists public.hse_observation_evidence (
  id uuid primary key default gen_random_uuid(),
  observation_id uuid not null references public.hse_observations(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  content_type text,
  uploaded_at timestamptz not null default now()
);

alter table public.hse_observations enable row level security;
alter table public.hse_observation_evidence enable row level security;

drop policy if exists "hse_observations_select_authenticated" on public.hse_observations;
drop policy if exists "hse_observations_insert_authenticated" on public.hse_observations;
drop policy if exists "hse_observations_update_authenticated" on public.hse_observations;
drop policy if exists "hse_observations_delete_authenticated" on public.hse_observations;

create policy "hse_observations_select_authenticated"
on public.hse_observations for select to authenticated using (true);

create policy "hse_observations_insert_authenticated"
on public.hse_observations for insert to authenticated with check (true);

create policy "hse_observations_update_authenticated"
on public.hse_observations for update to authenticated using (true) with check (true);

create policy "hse_observations_delete_authenticated"
on public.hse_observations for delete to authenticated using (true);

drop policy if exists "hse_observation_evidence_select_authenticated" on public.hse_observation_evidence;
drop policy if exists "hse_observation_evidence_insert_authenticated" on public.hse_observation_evidence;
drop policy if exists "hse_observation_evidence_update_authenticated" on public.hse_observation_evidence;
drop policy if exists "hse_observation_evidence_delete_authenticated" on public.hse_observation_evidence;

create policy "hse_observation_evidence_select_authenticated"
on public.hse_observation_evidence for select to authenticated using (true);

create policy "hse_observation_evidence_insert_authenticated"
on public.hse_observation_evidence for insert to authenticated with check (true);

create policy "hse_observation_evidence_update_authenticated"
on public.hse_observation_evidence for update to authenticated using (true) with check (true);

create policy "hse_observation_evidence_delete_authenticated"
on public.hse_observation_evidence for delete to authenticated using (true);

create index if not exists hse_observations_number_idx on public.hse_observations (observation_number);
create index if not exists hse_observations_date_idx on public.hse_observations (observation_date);
create index if not exists hse_observations_status_idx on public.hse_observations (status, observation_type, risk_level);
create index if not exists hse_observations_project_idx on public.hse_observations (project);
create index if not exists hse_observation_evidence_observation_idx on public.hse_observation_evidence (observation_id);
