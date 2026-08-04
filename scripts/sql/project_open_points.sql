create extension if not exists pgcrypto;

create sequence if not exists public.project_open_points_number_seq start 1;

create table if not exists public.project_open_point_settings (
  project_key text primary key,
  taking_over_date date,
  phase_milestones jsonb not null default '[]'::jsonb,
  sbs_options text[] not null default '{}',
  wbs_options text[] not null default '{}',
  cde_mirror_weekday integer not null default 5 check (cde_mirror_weekday between 1 and 7),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.project_open_points (
  id uuid primary key default gen_random_uuid(),
  project_key text not null default 'wadden-sea',
  open_point_number text not null unique default ('WSP-OP-' || lpad(nextval('public.project_open_points_number_seq')::text, 4, '0')),
  title text not null,
  description text not null,
  identified_date date not null default current_date,
  source_type text not null default 'Enshore' check (source_type in ('Enshore', 'Employer', 'Subcontractor', 'Supplier')),
  raised_by text,
  raised_by_person_id uuid references public.people(id) on delete set null,
  responsible_company text,
  owner text,
  owner_person_id uuid references public.people(id) on delete set null,
  severity text not null default 'Minor' check (severity in ('Critical', 'Major', 'Minor')),
  status text not null default 'Open' check (status in ('Draft', 'Open', 'In Progress', 'Ready for Verification', 'Employer Review', 'Closed', 'Converted to NCR', 'Unable to Correct', 'Formal Employer Close-out')),
  physical_component text,
  location text,
  inspection_test_reference text not null,
  itp_id uuid,
  itp_reference text,
  noi_point_id uuid,
  noi_reference text,
  sbs_reference text,
  wbs_reference text,
  project_phase text,
  phase_end_date date,
  taking_over_date date,
  target_closure_date date,
  employer_extension_agreed boolean not null default false,
  employer_extension_date date,
  employer_extension_reference text,
  toc_inclusion_agreed boolean not null default false,
  toc_reference text,
  risk_id uuid,
  risk_reference text,
  ncr_id uuid,
  ncr_reference text,
  resolution_action text,
  verification_method text,
  verified_by text,
  verified_at timestamptz,
  employer_verification_status text not null default 'Not Submitted' check (employer_verification_status in ('Not Submitted', 'Submitted', 'Joint Inspection Planned', 'Accepted', 'Rejected', 'Formal Close-out')),
  employer_verified_by text,
  employer_verified_at timestamptz,
  closure_date date,
  closure_report_reference text,
  unable_to_correct_reason text,
  formal_closeout_reference text,
  cde_registration_due date,
  cde_registered_at timestamptz,
  cde_mirrored_at timestamptz,
  cde_submission_reference text,
  cde_uploaded_by text,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_open_points_employer_registration check (source_type <> 'Employer' or cde_registration_due is not null),
  constraint project_open_points_closed_controls check (status not in ('Closed', 'Formal Employer Close-out') or (closure_date is not null and verified_at is not null)),
  constraint project_open_points_unable_controls check (status <> 'Unable to Correct' or unable_to_correct_reason is not null),
  constraint project_open_points_formal_closeout_controls check (status <> 'Formal Employer Close-out' or formal_closeout_reference is not null),
  constraint project_open_points_ncr_conversion_controls check (status <> 'Converted to NCR' or ncr_reference is not null)
);

create table if not exists public.project_open_point_evidence (
  id uuid primary key default gen_random_uuid(),
  open_point_id uuid not null references public.project_open_points(id) on delete cascade,
  evidence_type text not null default 'Supporting Evidence' check (evidence_type in ('Supporting Evidence', 'Closure Evidence', 'CDE Submission', 'Employer Acceptance', 'Joint Inspection', 'Formal Close-out')),
  file_name text not null,
  file_path text not null,
  file_size bigint,
  content_type text,
  notes text,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.project_open_point_history (
  id uuid primary key default gen_random_uuid(),
  open_point_id uuid not null,
  action_type text not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  snapshot jsonb not null
);

create table if not exists public.project_open_point_settings_history (
  id uuid primary key default gen_random_uuid(),
  project_key text not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now(),
  snapshot jsonb not null
);

alter table public.project_open_points add column if not exists raised_by_person_id uuid references public.people(id) on delete set null;

create or replace function public.set_project_open_point_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  new.updated_by = coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

create or replace function public.log_project_open_point_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.project_open_point_history (open_point_id, action_type, changed_by, snapshot)
  values (coalesce(new.id, old.id), tg_op, auth.uid(), case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end);
  return coalesce(new, old);
end;
$$;

create or replace function public.log_project_open_point_settings_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.project_open_point_settings_history (project_key, changed_by, snapshot)
  values (new.project_key, auth.uid(), to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists project_open_points_updated_at on public.project_open_points;
create trigger project_open_points_updated_at before update on public.project_open_points
for each row execute function public.set_project_open_point_updated_at();

drop trigger if exists project_open_points_history on public.project_open_points;
create trigger project_open_points_history after insert or update or delete on public.project_open_points
for each row execute function public.log_project_open_point_history();

drop trigger if exists project_open_point_settings_history on public.project_open_point_settings;
create trigger project_open_point_settings_history after insert or update on public.project_open_point_settings
for each row execute function public.log_project_open_point_settings_history();

create index if not exists project_open_points_project_status_idx on public.project_open_points (project_key, status, severity);
create index if not exists project_open_points_target_idx on public.project_open_points (target_closure_date);
create index if not exists project_open_points_phase_idx on public.project_open_points (project_phase, phase_end_date);
create index if not exists project_open_points_cde_idx on public.project_open_points (cde_registration_due, cde_mirrored_at);
create index if not exists project_open_points_owner_idx on public.project_open_points (owner_person_id, responsible_company);
create index if not exists project_open_point_evidence_point_idx on public.project_open_point_evidence (open_point_id, uploaded_at desc);
create index if not exists project_open_point_history_point_idx on public.project_open_point_history (open_point_id, changed_at desc);
create index if not exists project_open_point_settings_history_project_idx on public.project_open_point_settings_history (project_key, changed_at desc);

alter table public.project_open_point_settings enable row level security;
alter table public.project_open_points enable row level security;
alter table public.project_open_point_evidence enable row level security;
alter table public.project_open_point_history enable row level security;
alter table public.project_open_point_settings_history enable row level security;

drop policy if exists project_open_point_settings_authenticated on public.project_open_point_settings;
create policy project_open_point_settings_authenticated on public.project_open_point_settings for all to authenticated using (true) with check (true);
drop policy if exists project_open_points_authenticated on public.project_open_points;
create policy project_open_points_authenticated on public.project_open_points for all to authenticated using (true) with check (true);
drop policy if exists project_open_point_evidence_authenticated on public.project_open_point_evidence;
create policy project_open_point_evidence_authenticated on public.project_open_point_evidence for all to authenticated using (true) with check (true);
drop policy if exists project_open_point_history_select_authenticated on public.project_open_point_history;
create policy project_open_point_history_select_authenticated on public.project_open_point_history for select to authenticated using (true);
drop policy if exists project_open_point_settings_history_select_authenticated on public.project_open_point_settings_history;
create policy project_open_point_settings_history_select_authenticated on public.project_open_point_settings_history for select to authenticated using (true);

insert into public.project_open_point_settings (project_key)
values ('wadden-sea')
on conflict (project_key) do nothing;
