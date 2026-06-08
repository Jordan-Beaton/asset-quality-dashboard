create table if not exists public.hse_ptw_records (
  id uuid primary key default gen_random_uuid(),
  ptw_number text not null unique,
  status text not null default 'Draft',
  work_types text[] not null default '{}',
  other_work_type text,
  description_of_work text,
  equipment_tools text,
  exact_location text,
  risk_assessment text,
  lift_plan text,
  isolation_required text,
  electrical_isolation text,
  mechanical_isolation text,
  pressure_isolation text,
  isolation_description text,
  precautions text[] not null default '{}',
  other_precaution text,
  checklist_used text,
  pte_condition text,
  issuing_authority_hours text,
  start_time text,
  start_date date,
  end_time text,
  end_date date,
  issued_by jsonb not null default '{}'::jsonb,
  accepted_by jsonb not null default '{}'::jsonb,
  extensions jsonb not null default '[]'::jsonb,
  closure_person jsonb not null default '{}'::jsonb,
  closure_authority jsonb not null default '{}'::jsonb,
  attachments text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hse_ptw_records enable row level security;

drop policy if exists "hse_ptw_records_select_authenticated" on public.hse_ptw_records;
drop policy if exists "hse_ptw_records_insert_authenticated" on public.hse_ptw_records;
drop policy if exists "hse_ptw_records_update_authenticated" on public.hse_ptw_records;
drop policy if exists "hse_ptw_records_delete_authenticated" on public.hse_ptw_records;

create policy "hse_ptw_records_select_authenticated"
on public.hse_ptw_records for select to authenticated using (true);

create policy "hse_ptw_records_insert_authenticated"
on public.hse_ptw_records for insert to authenticated with check (true);

create policy "hse_ptw_records_update_authenticated"
on public.hse_ptw_records for update to authenticated using (true) with check (true);

create policy "hse_ptw_records_delete_authenticated"
on public.hse_ptw_records for delete to authenticated using (true);

create index if not exists hse_ptw_records_number_idx on public.hse_ptw_records (ptw_number);
create index if not exists hse_ptw_records_status_idx on public.hse_ptw_records (status);
create index if not exists hse_ptw_records_start_date_idx on public.hse_ptw_records (start_date);

create table if not exists public.hse_ptw_attachments (
  id uuid primary key default gen_random_uuid(),
  ptw_id uuid not null references public.hse_ptw_records(id) on delete cascade,
  attachment_type text not null,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  content_type text,
  uploaded_at timestamptz not null default now()
);

alter table public.hse_ptw_attachments enable row level security;

drop policy if exists "hse_ptw_attachments_select_authenticated" on public.hse_ptw_attachments;
drop policy if exists "hse_ptw_attachments_insert_authenticated" on public.hse_ptw_attachments;
drop policy if exists "hse_ptw_attachments_update_authenticated" on public.hse_ptw_attachments;
drop policy if exists "hse_ptw_attachments_delete_authenticated" on public.hse_ptw_attachments;

create policy "hse_ptw_attachments_select_authenticated"
on public.hse_ptw_attachments for select to authenticated using (true);

create policy "hse_ptw_attachments_insert_authenticated"
on public.hse_ptw_attachments for insert to authenticated with check (true);

create policy "hse_ptw_attachments_update_authenticated"
on public.hse_ptw_attachments for update to authenticated using (true) with check (true);

create policy "hse_ptw_attachments_delete_authenticated"
on public.hse_ptw_attachments for delete to authenticated using (true);

create index if not exists hse_ptw_attachments_ptw_idx on public.hse_ptw_attachments (ptw_id);
create index if not exists hse_ptw_attachments_type_idx on public.hse_ptw_attachments (ptw_id, attachment_type);
