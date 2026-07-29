create extension if not exists pgcrypto;

create table if not exists public.project_itps (
  id uuid primary key default gen_random_uuid(),
  project_key text not null,
  document_number text not null,
  title text not null,
  supplier text,
  scope text,
  package_name text,
  discipline text,
  enshore_reviewer text,
  overall_stage text not null default 'Supplier',
  overall_status text not null default 'Not Submitted / TBC',
  next_action text,
  due_date date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_key, document_number)
);

create table if not exists public.project_itp_revisions (
  id uuid primary key default gen_random_uuid(),
  itp_id uuid not null references public.project_itps(id) on delete cascade,
  revision text not null,
  revision_date date,
  supplier_status text,
  enshore_decision text,
  enshore_reviewed_at date,
  enshore_comments text,
  sent_to_client_at date,
  client_decision text,
  client_decision_at date,
  client_comments text,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  content_type text,
  extraction_confidence text,
  extracted_metadata jsonb not null default '{}'::jsonb,
  is_current boolean not null default true,
  supersedes_revision_id uuid references public.project_itp_revisions(id),
  superseded_at timestamptz,
  superseded_by_revision_id uuid references public.project_itp_revisions(id),
  uploaded_by uuid references auth.users(id),
  uploaded_at timestamptz not null default now(),
  unique (itp_id, revision)
);

create index if not exists project_itps_project_idx
  on public.project_itps (project_key, updated_at desc);
create index if not exists project_itp_revisions_itp_idx
  on public.project_itp_revisions (itp_id, uploaded_at desc);

create table if not exists public.project_itp_revision_deletion_log (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null,
  itp_id uuid not null,
  revision text not null,
  file_name text not null,
  file_path text not null,
  deleted_by uuid references auth.users(id),
  deleted_at timestamptz not null default now(),
  deleted_record jsonb not null
);

alter table public.project_itp_revision_deletion_log enable row level security;
drop policy if exists project_itp_revision_deletion_log_select_authenticated on public.project_itp_revision_deletion_log;
create policy project_itp_revision_deletion_log_select_authenticated
  on public.project_itp_revision_deletion_log for select to authenticated using (true);

create or replace function public.log_project_itp_revision_deletion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_itp_revision_deletion_log
    (revision_id, itp_id, revision, file_name, file_path, deleted_by, deleted_record)
  values
    (old.id, old.itp_id, old.revision, old.file_name, old.file_path, auth.uid(), to_jsonb(old));
  return old;
end;
$$;

drop trigger if exists project_itp_revision_deletion_audit on public.project_itp_revisions;
create trigger project_itp_revision_deletion_audit
  before delete on public.project_itp_revisions
  for each row execute function public.log_project_itp_revision_deletion();

create table if not exists public.project_noi_points (
  id uuid primary key default gen_random_uuid(),
  project_key text not null,
  itp_id uuid not null references public.project_itps(id) on delete cascade,
  revision_id uuid not null references public.project_itp_revisions(id) on delete cascade,
  section_number text not null,
  activity_description text not null,
  intervention_type text not null check (intervention_type ~ '(^|/)(W|H)($|/)'),
  party_heading text not null,
  extraction_confidence text not null default 'Medium',
  source_location text,
  status text not null default 'Planned',
  planned_date date,
  noi_number text,
  notes text,
  manually_confirmed boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (revision_id, section_number, intervention_type, activity_description)
);

create index if not exists project_noi_points_project_idx
  on public.project_noi_points (project_key, status, planned_date);
create index if not exists project_noi_points_itp_idx
  on public.project_noi_points (itp_id, revision_id);

alter table public.project_noi_points enable row level security;
alter table public.project_noi_points
  drop constraint if exists project_noi_points_intervention_type_check;
alter table public.project_noi_points
  add constraint project_noi_points_intervention_type_check
  check (intervention_type ~ '(^|/)(W|H)($|/)');
drop policy if exists project_noi_points_authenticated on public.project_noi_points;
create policy project_noi_points_authenticated on public.project_noi_points
  for all to authenticated using (true) with check (true);

alter table public.project_itps enable row level security;
alter table public.project_itp_revisions enable row level security;

alter table public.project_itp_revisions
  add column if not exists supersedes_revision_id uuid references public.project_itp_revisions(id),
  add column if not exists superseded_at timestamptz,
  add column if not exists superseded_by_revision_id uuid references public.project_itp_revisions(id);

drop policy if exists project_itps_authenticated on public.project_itps;
create policy project_itps_authenticated on public.project_itps
  for all to authenticated using (true) with check (true);
drop policy if exists project_itp_revisions_authenticated on public.project_itp_revisions;
create policy project_itp_revisions_authenticated on public.project_itp_revisions
  for all to authenticated using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('project-documents', 'project-documents', false)
on conflict (id) do nothing;

drop policy if exists project_documents_select_authenticated on storage.objects;
create policy project_documents_select_authenticated on storage.objects
  for select to authenticated using (bucket_id = 'project-documents');
drop policy if exists project_documents_insert_authenticated on storage.objects;
create policy project_documents_insert_authenticated on storage.objects
  for insert to authenticated with check (bucket_id = 'project-documents');
drop policy if exists project_documents_update_authenticated on storage.objects;
create policy project_documents_update_authenticated on storage.objects
  for update to authenticated using (bucket_id = 'project-documents')
  with check (bucket_id = 'project-documents');
drop policy if exists project_documents_delete_authenticated on storage.objects;
create policy project_documents_delete_authenticated on storage.objects
  for delete to authenticated using (bucket_id = 'project-documents');
