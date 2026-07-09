create table if not exists public.evidence_files (
  id uuid primary key default gen_random_uuid(),
  record_type text not null,
  record_id uuid not null,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  content_type text,
  notes text,
  uploaded_at timestamptz not null default now()
);

alter table public.evidence_files
  add column if not exists record_type text,
  add column if not exists record_id uuid,
  add column if not exists file_name text,
  add column if not exists file_path text,
  add column if not exists file_size bigint,
  add column if not exists content_type text,
  add column if not exists notes text,
  add column if not exists uploaded_at timestamptz not null default now();

create index if not exists evidence_files_record_idx
  on public.evidence_files (record_type, record_id);

create index if not exists evidence_files_uploaded_at_idx
  on public.evidence_files (uploaded_at desc);

alter table public.evidence_files enable row level security;

drop policy if exists evidence_files_select_authenticated on public.evidence_files;
create policy evidence_files_select_authenticated
  on public.evidence_files
  for select
  to authenticated
  using (true);

drop policy if exists evidence_files_insert_authenticated on public.evidence_files;
create policy evidence_files_insert_authenticated
  on public.evidence_files
  for insert
  to authenticated
  with check (true);

drop policy if exists evidence_files_update_authenticated on public.evidence_files;
create policy evidence_files_update_authenticated
  on public.evidence_files
  for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists evidence_files_delete_authenticated on public.evidence_files;
create policy evidence_files_delete_authenticated
  on public.evidence_files
  for delete
  to authenticated
  using (true);
