create table if not exists public.hse_ainm_records (
  id uuid primary key default gen_random_uuid(),
  ainm_number text not null unique,
  title text not null,
  project text,
  location_site text,
  event_date date,
  event_time text,
  event_classification text,
  company_in_control text,
  report_ref text,
  brief_event_details text,
  injury_release_damage_details text,
  initial_response_details text,
  casualty_management text,
  site_management text,
  initial_cause text,
  additional_information text,
  environmental_release_type text,
  environmental_release_quantity text,
  immediate_corrective_actions text,
  investigation_team_members jsonb not null default '[]'::jsonb,
  root_cause_people text,
  root_cause_equipment text,
  root_cause_environment text,
  root_cause_process text,
  attachments_checklist text[] not null default '{}',
  part1_additional_comments text,
  part1_reviewer_name text,
  part1_reviewer_position text,
  investigation_findings_people text,
  investigation_findings_equipment text,
  investigation_findings_environment text,
  investigation_findings_process text,
  reference_documents text,
  part2_further_comments text,
  signoff_location_name text,
  signoff_location_position text,
  signoff_location_date date,
  signoff_hseq_name text,
  signoff_hseq_position text,
  signoff_hseq_date date,
  signoff_project_manager_name text,
  signoff_project_manager_position text,
  signoff_project_manager_date date,
  signoff_smt_name text,
  signoff_smt_position text,
  signoff_smt_date date,
  notification_status text not null default 'Not Started',
  notification_sent_at timestamptz,
  part1_status text not null default 'Not Started',
  part1_completed_at timestamptz,
  part2_status text not null default 'Not Started',
  part2_completed_at timestamptz,
  overall_status text not null default 'Open',
  owner text,
  comments text,
  source_import_year integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hse_ainm_actions (
  id uuid primary key default gen_random_uuid(),
  ainm_id uuid not null references public.hse_ainm_records(id) on delete cascade,
  tracker_no text,
  project text,
  ainm_number text,
  action text,
  assigned text,
  date_raised date,
  date_closed text,
  status text,
  comments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hse_ainm_evidence (
  id uuid primary key default gen_random_uuid(),
  ainm_id uuid not null references public.hse_ainm_records(id) on delete cascade,
  stage text not null default 'General',
  file_name text not null,
  file_path text not null,
  file_size bigint,
  content_type text,
  notes text,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.hse_ainm_generated_documents (
  id uuid primary key default gen_random_uuid(),
  ainm_id uuid not null references public.hse_ainm_records(id) on delete cascade,
  document_stage text not null,
  file_name text,
  file_path text,
  file_size bigint,
  content_type text,
  generated_at timestamptz not null default now(),
  generated_by text
);

alter table public.hse_ainm_records enable row level security;
alter table public.hse_ainm_actions enable row level security;
alter table public.hse_ainm_evidence enable row level security;
alter table public.hse_ainm_generated_documents enable row level security;

drop policy if exists "hse_ainm_records_select_authenticated" on public.hse_ainm_records;
drop policy if exists "hse_ainm_records_insert_authenticated" on public.hse_ainm_records;
drop policy if exists "hse_ainm_records_update_authenticated" on public.hse_ainm_records;
drop policy if exists "hse_ainm_records_delete_authenticated" on public.hse_ainm_records;

create policy "hse_ainm_records_select_authenticated"
on public.hse_ainm_records for select to authenticated using (true);

create policy "hse_ainm_records_insert_authenticated"
on public.hse_ainm_records for insert to authenticated with check (true);

create policy "hse_ainm_records_update_authenticated"
on public.hse_ainm_records for update to authenticated using (true) with check (true);

create policy "hse_ainm_records_delete_authenticated"
on public.hse_ainm_records for delete to authenticated using (true);

drop policy if exists "hse_ainm_actions_select_authenticated" on public.hse_ainm_actions;
drop policy if exists "hse_ainm_actions_insert_authenticated" on public.hse_ainm_actions;
drop policy if exists "hse_ainm_actions_update_authenticated" on public.hse_ainm_actions;
drop policy if exists "hse_ainm_actions_delete_authenticated" on public.hse_ainm_actions;

create policy "hse_ainm_actions_select_authenticated"
on public.hse_ainm_actions for select to authenticated using (true);

create policy "hse_ainm_actions_insert_authenticated"
on public.hse_ainm_actions for insert to authenticated with check (true);

create policy "hse_ainm_actions_update_authenticated"
on public.hse_ainm_actions for update to authenticated using (true) with check (true);

create policy "hse_ainm_actions_delete_authenticated"
on public.hse_ainm_actions for delete to authenticated using (true);

drop policy if exists "hse_ainm_evidence_select_authenticated" on public.hse_ainm_evidence;
drop policy if exists "hse_ainm_evidence_insert_authenticated" on public.hse_ainm_evidence;
drop policy if exists "hse_ainm_evidence_update_authenticated" on public.hse_ainm_evidence;
drop policy if exists "hse_ainm_evidence_delete_authenticated" on public.hse_ainm_evidence;

create policy "hse_ainm_evidence_select_authenticated"
on public.hse_ainm_evidence for select to authenticated using (true);

create policy "hse_ainm_evidence_insert_authenticated"
on public.hse_ainm_evidence for insert to authenticated with check (true);

create policy "hse_ainm_evidence_update_authenticated"
on public.hse_ainm_evidence for update to authenticated using (true) with check (true);

create policy "hse_ainm_evidence_delete_authenticated"
on public.hse_ainm_evidence for delete to authenticated using (true);

drop policy if exists "hse_ainm_generated_documents_select_authenticated" on public.hse_ainm_generated_documents;
drop policy if exists "hse_ainm_generated_documents_insert_authenticated" on public.hse_ainm_generated_documents;
drop policy if exists "hse_ainm_generated_documents_update_authenticated" on public.hse_ainm_generated_documents;
drop policy if exists "hse_ainm_generated_documents_delete_authenticated" on public.hse_ainm_generated_documents;

create policy "hse_ainm_generated_documents_select_authenticated"
on public.hse_ainm_generated_documents for select to authenticated using (true);

create policy "hse_ainm_generated_documents_insert_authenticated"
on public.hse_ainm_generated_documents for insert to authenticated with check (true);

create policy "hse_ainm_generated_documents_update_authenticated"
on public.hse_ainm_generated_documents for update to authenticated using (true) with check (true);

create policy "hse_ainm_generated_documents_delete_authenticated"
on public.hse_ainm_generated_documents for delete to authenticated using (true);

create index if not exists hse_ainm_records_number_idx on public.hse_ainm_records (ainm_number);
create index if not exists hse_ainm_records_event_date_idx on public.hse_ainm_records (event_date);
create index if not exists hse_ainm_records_status_idx on public.hse_ainm_records (overall_status, notification_status, part1_status, part2_status);
create index if not exists hse_ainm_actions_ainm_id_idx on public.hse_ainm_actions (ainm_id);
create index if not exists hse_ainm_evidence_ainm_id_idx on public.hse_ainm_evidence (ainm_id);
create index if not exists hse_ainm_generated_documents_ainm_id_idx on public.hse_ainm_generated_documents (ainm_id);

alter table public.hse_ainm_records
add column if not exists investigation_team_members jsonb not null default '[]'::jsonb;

alter table public.hse_ainm_generated_documents
add column if not exists file_path text,
add column if not exists file_size bigint,
add column if not exists content_type text;
