create sequence if not exists public.hse_external_ainm_number_seq;

create table if not exists public.hse_external_ainm_records (
  id uuid primary key default gen_random_uuid(),
  external_ainm_number text not null unique,
  external_party_type text,
  supplier_name text,
  supplier_reference text,
  project text,
  location_site text,
  event_date date,
  event_type text,
  enshore_contact text,
  summary text,
  immediate_actions text,
  status text not null default 'Logged',
  include_in_statistics boolean not null default false,
  comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hse_external_ainm_evidence (
  id uuid primary key default gen_random_uuid(),
  external_ainm_id uuid not null references public.hse_external_ainm_records(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  content_type text,
  notes text,
  uploaded_at timestamptz not null default now()
);

do $$
declare
  max_existing integer;
begin
  select coalesce(max((regexp_match(external_ainm_number, '^EXT-AINM-([0-9]+)$'))[1]::integer), 0)
  into max_existing
  from public.hse_external_ainm_records
  where external_ainm_number ~ '^EXT-AINM-[0-9]+$';

  perform setval('public.hse_external_ainm_number_seq', greatest(max_existing, 1), max_existing > 0);
end $$;

create or replace function public.next_hse_external_ainm_number()
returns text
language sql
as $$
  select 'EXT-AINM-' || lpad(nextval('public.hse_external_ainm_number_seq')::text, 3, '0');
$$;

alter table public.hse_external_ainm_records enable row level security;
alter table public.hse_external_ainm_evidence enable row level security;

drop policy if exists "hse_external_ainm_records_select_authenticated" on public.hse_external_ainm_records;
drop policy if exists "hse_external_ainm_records_insert_authenticated" on public.hse_external_ainm_records;
drop policy if exists "hse_external_ainm_records_update_authenticated" on public.hse_external_ainm_records;
drop policy if exists "hse_external_ainm_records_delete_authenticated" on public.hse_external_ainm_records;

create policy "hse_external_ainm_records_select_authenticated"
on public.hse_external_ainm_records for select to authenticated using (true);

create policy "hse_external_ainm_records_insert_authenticated"
on public.hse_external_ainm_records for insert to authenticated with check (true);

create policy "hse_external_ainm_records_update_authenticated"
on public.hse_external_ainm_records for update to authenticated using (true) with check (true);

create policy "hse_external_ainm_records_delete_authenticated"
on public.hse_external_ainm_records for delete to authenticated using (true);

drop policy if exists "hse_external_ainm_evidence_select_authenticated" on public.hse_external_ainm_evidence;
drop policy if exists "hse_external_ainm_evidence_insert_authenticated" on public.hse_external_ainm_evidence;
drop policy if exists "hse_external_ainm_evidence_update_authenticated" on public.hse_external_ainm_evidence;
drop policy if exists "hse_external_ainm_evidence_delete_authenticated" on public.hse_external_ainm_evidence;

create policy "hse_external_ainm_evidence_select_authenticated"
on public.hse_external_ainm_evidence for select to authenticated using (true);

create policy "hse_external_ainm_evidence_insert_authenticated"
on public.hse_external_ainm_evidence for insert to authenticated with check (true);

create policy "hse_external_ainm_evidence_update_authenticated"
on public.hse_external_ainm_evidence for update to authenticated using (true) with check (true);

create policy "hse_external_ainm_evidence_delete_authenticated"
on public.hse_external_ainm_evidence for delete to authenticated using (true);

create index if not exists hse_external_ainm_records_number_idx on public.hse_external_ainm_records (external_ainm_number);
create index if not exists hse_external_ainm_records_event_date_idx on public.hse_external_ainm_records (event_date);
create index if not exists hse_external_ainm_records_status_idx on public.hse_external_ainm_records (status);
create index if not exists hse_external_ainm_records_party_type_idx on public.hse_external_ainm_records (external_party_type);
create index if not exists hse_external_ainm_records_include_stats_idx on public.hse_external_ainm_records (include_in_statistics);
create index if not exists hse_external_ainm_evidence_record_idx on public.hse_external_ainm_evidence (external_ainm_id);
