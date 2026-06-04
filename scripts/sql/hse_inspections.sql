create table if not exists public.hse_inspection_records (
  id uuid primary key default gen_random_uuid(),
  inspection_number text not null unique,
  form_id text not null,
  form_number text not null,
  form_revision text,
  form_revision_date date,
  form_title text not null,
  title text not null,
  department text,
  project_work_scope text,
  vessel_spread text,
  area_zone text,
  inspection_date date,
  inspector_name text,
  inspector_position text,
  status text not null default 'Draft',
  checklist_responses jsonb not null default '{}'::jsonb,
  additional_comments text,
  actions jsonb not null default '[]'::jsonb,
  signoff_name text,
  signoff_position text,
  signoff_company text,
  signoff_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hse_inspection_evidence (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.hse_inspection_records(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  content_type text,
  notes text,
  uploaded_at timestamptz not null default now()
);

alter table public.hse_inspection_records enable row level security;
alter table public.hse_inspection_evidence enable row level security;

drop policy if exists "hse_inspection_records_select_authenticated" on public.hse_inspection_records;
drop policy if exists "hse_inspection_records_insert_authenticated" on public.hse_inspection_records;
drop policy if exists "hse_inspection_records_update_authenticated" on public.hse_inspection_records;
drop policy if exists "hse_inspection_records_delete_authenticated" on public.hse_inspection_records;

create policy "hse_inspection_records_select_authenticated"
on public.hse_inspection_records for select to authenticated using (true);

create policy "hse_inspection_records_insert_authenticated"
on public.hse_inspection_records for insert to authenticated with check (true);

create policy "hse_inspection_records_update_authenticated"
on public.hse_inspection_records for update to authenticated using (true) with check (true);

create policy "hse_inspection_records_delete_authenticated"
on public.hse_inspection_records for delete to authenticated using (true);

drop policy if exists "hse_inspection_evidence_select_authenticated" on public.hse_inspection_evidence;
drop policy if exists "hse_inspection_evidence_insert_authenticated" on public.hse_inspection_evidence;
drop policy if exists "hse_inspection_evidence_update_authenticated" on public.hse_inspection_evidence;
drop policy if exists "hse_inspection_evidence_delete_authenticated" on public.hse_inspection_evidence;

create policy "hse_inspection_evidence_select_authenticated"
on public.hse_inspection_evidence for select to authenticated using (true);

create policy "hse_inspection_evidence_insert_authenticated"
on public.hse_inspection_evidence for insert to authenticated with check (true);

create policy "hse_inspection_evidence_update_authenticated"
on public.hse_inspection_evidence for update to authenticated using (true) with check (true);

create policy "hse_inspection_evidence_delete_authenticated"
on public.hse_inspection_evidence for delete to authenticated using (true);

create index if not exists hse_inspection_records_number_idx on public.hse_inspection_records (inspection_number);
create index if not exists hse_inspection_records_form_idx on public.hse_inspection_records (form_id, status);
create index if not exists hse_inspection_records_date_idx on public.hse_inspection_records (inspection_date);
create index if not exists hse_inspection_evidence_inspection_idx on public.hse_inspection_evidence (inspection_id);

alter table public.hse_inspection_evidence
add column if not exists item_number text;

create index if not exists hse_inspection_evidence_item_idx
on public.hse_inspection_evidence (inspection_id, item_number);

alter table public.actions
add column if not exists linked_hse_inspection_id uuid,
add column if not exists linked_hse_inspection_number text;

create index if not exists actions_linked_hse_inspection_idx
on public.actions (linked_hse_inspection_id, linked_hse_inspection_number);
