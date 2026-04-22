create table if not exists public.moc_reports (
  id uuid primary key default gen_random_uuid(),
  moc_report_no text not null unique,
  moc_report_title text,
  project_worksite_address text,
  moc_coordinator_name text,
  moc_coordinator_position text,
  responsible_manager_name text,
  responsible_manager_position text,
  proposed_change_description text,
  reason_for_change text,
  change_type text default 'Permanent',
  temporary_valid_from date,
  temporary_valid_to date,
  implementation_plan text,
  supporting_documentation_note text,
  impact_health_safety boolean default false,
  impact_environment boolean default false,
  impact_quality boolean default false,
  impact_scm boolean default false,
  impact_schedule boolean default false,
  impact_equipment boolean default false,
  impact_fabrication_opps boolean default false,
  impact_engineering boolean default false,
  impact_marine_operations boolean default false,
  impact_organization boolean default false,
  impact_regulatory boolean default false,
  impact_documentation boolean default false,
  impact_reputation boolean default false,
  impact_simops boolean default false,
  impact_other boolean default false,
  impact_other_text text,
  hira_required text default 'N/A',
  hira_reason text,
  lifting_change_status text default 'N/A',
  lifting_change_description text,
  ptw_change_status text default 'N/A',
  ptw_change_description text,
  environmental_impact_description text,
  hazard_risks_description text,
  proposed_risk_mitigations text,
  cost_review_description text,
  schedule_review_description text,
  supporting_documentation_information text,
  variation_order_reference_no text,
  variation_order_na boolean default false,
  status text default 'Draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.moc_action_plan_items (
  id uuid primary key default gen_random_uuid(),
  moc_report_id uuid not null references public.moc_reports(id) on delete cascade,
  sort_order integer not null default 0,
  action_no text,
  description text,
  responsible_person text,
  target_date date,
  status text
);

create table if not exists public.moc_affected_documents (
  id uuid primary key default gen_random_uuid(),
  moc_report_id uuid not null references public.moc_reports(id) on delete cascade,
  sort_order integer not null default 0,
  number text,
  title text,
  rev text
);

create table if not exists public.moc_risk_documents (
  id uuid primary key default gen_random_uuid(),
  moc_report_id uuid not null references public.moc_reports(id) on delete cascade,
  sort_order integer not null default 0,
  number text,
  title text,
  rev text
);

create table if not exists public.moc_review_endorsement_rows (
  id uuid primary key default gen_random_uuid(),
  moc_report_id uuid not null references public.moc_reports(id) on delete cascade,
  sort_order integer not null default 0,
  involved_party text,
  approve_flag boolean default false,
  inform_flag boolean default false,
  name text,
  position text,
  approved_value text default 'Yes',
  signature text,
  review_date date,
  comments text
);

create table if not exists public.moc_acceptance_rows (
  id uuid primary key default gen_random_uuid(),
  moc_report_id uuid not null references public.moc_reports(id) on delete cascade,
  sort_order integer not null default 0,
  role_label text,
  position text,
  name text,
  signature text,
  signoff_date date
);

create table if not exists public.moc_closeout_rows (
  id uuid primary key default gen_random_uuid(),
  moc_report_id uuid not null references public.moc_reports(id) on delete cascade,
  sort_order integer not null default 0,
  role_label text,
  position text,
  name text,
  signature text,
  signoff_date date
);
