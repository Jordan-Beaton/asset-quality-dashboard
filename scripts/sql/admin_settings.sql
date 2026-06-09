-- Admin / Settings Phase 1
-- Safe additive setup for user roles, company profile, and reference data.

alter table public.people
add column if not exists system_role text not null default 'Viewer',
add column if not exists access_status text not null default 'Active',
add column if not exists is_master_admin boolean not null default false,
add column if not exists last_login_at timestamptz,
add column if not exists permissions_notes text,
add column if not exists permission_override text not null default 'Role Default',
add column if not exists quality_access text,
add column if not exists hse_access text,
add column if not exists asset_access text,
add column if not exists risk_access text,
add column if not exists document_access text,
add column if not exists action_access text,
add column if not exists admin_access text;

create index if not exists people_system_role_idx
  on public.people(system_role);

create index if not exists people_access_status_idx
  on public.people(access_status);

update public.people
set
  system_role = 'Admin',
  access_status = 'Active',
  is_master_admin = true,
  permission_override = 'Full System Access',
  quality_access = 'Full',
  hse_access = 'Full',
  asset_access = 'Full',
  risk_access = 'Full',
  document_access = 'Full',
  action_access = 'Full',
  admin_access = 'Full',
  active = true
where lower(coalesce(email, '')) = 'jbeaton@enshoresubsea.com'
   or lower(name) = 'jordan beaton';

create table if not exists public.ims_company_settings (
  id uuid primary key default gen_random_uuid(),
  company_name text not null default 'Enshore Subsea',
  trading_name text,
  address text,
  primary_contact_name text,
  primary_contact_email text,
  report_logo_path text,
  primary_brand_colour text not null default '#3A9B98',
  financial_year_start_month integer not null default 1,
  updated_at timestamptz not null default now()
);

insert into public.ims_company_settings (company_name, trading_name, primary_brand_colour)
select 'Enshore Subsea', 'Enshore', '#3A9B98'
where not exists (select 1 from public.ims_company_settings);

create table if not exists public.ims_reference_departments (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ims_reference_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null default 'Project',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.ims_roles (
  id uuid primary key default gen_random_uuid(),
  role_name text not null unique,
  description text,
  quality_access text not null default 'None',
  hse_access text not null default 'None',
  asset_access text not null default 'None',
  risk_access text not null default 'None',
  action_access text not null default 'None',
  admin_access text not null default 'None',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.ims_roles (role_name, description, quality_access, hse_access, asset_access, risk_access, action_access, admin_access)
values
  ('Admin', 'Full IMS administration and operational access.', 'Full', 'Full', 'Full', 'Full', 'Full', 'Full'),
  ('Manager', 'Management visibility, approvals, and closure control.', 'Approve', 'Approve', 'Approve', 'Approve', 'Full', 'None'),
  ('HSE Officer', 'Full HSE access and HSE action ownership.', 'Read', 'Full', 'Read', 'Read', 'Full', 'None'),
  ('Quality Engineer', 'Full Quality access and Quality action ownership.', 'Full', 'Read', 'Read', 'Read', 'Full', 'None'),
  ('Document Controller', 'Document Control administration and review support.', 'Documents', 'Read', 'Read', 'Read', 'Read', 'None'),
  ('Asset Manager', 'Full Asset Management access.', 'Read', 'Read', 'Full', 'Read', 'Full', 'None'),
  ('Viewer', 'Read-only IMS visibility.', 'Read', 'Read', 'Read', 'Read', 'Read', 'None'),
  ('Contractor', 'Public HSE observation submission only.', 'None', 'Observe', 'None', 'None', 'None', 'None')
on conflict (role_name) do nothing;

insert into public.ims_roles (role_name, description, quality_access, hse_access, asset_access, risk_access, action_access, admin_access)
values
  ('Project Manager', 'Project-facing visibility and action ownership.', 'Read', 'Read', 'Read', 'Read', 'Full', 'None'),
  ('Department Head', 'Department leadership visibility and approval support.', 'Approve', 'Approve', 'Read', 'Read', 'Full', 'None'),
  ('Operations Manager', 'Operational module visibility and HSE/action ownership.', 'Read', 'Full', 'Read', 'Read', 'Full', 'None'),
  ('Crewing Manager', 'Crewing-related read access and assigned action ownership.', 'Read', 'Read', 'None', 'None', 'Full', 'None'),
  ('Finance User', 'Finance document visibility and assigned action ownership.', 'Read', 'Read', 'None', 'None', 'Read', 'None'),
  ('Procurement User', 'Procurement document visibility and assigned action ownership.', 'Read', 'Read', 'None', 'None', 'Read', 'None'),
  ('Survey User', 'Survey document visibility and assigned action ownership.', 'Read', 'Read', 'Read', 'None', 'Read', 'None'),
  ('External Auditor', 'Read-only audit support access.', 'Read', 'Read', 'None', 'None', 'None', 'None')
on conflict (role_name) do nothing;

insert into public.ims_reference_departments (name, code)
values
  ('Assets', 'AST'),
  ('Commercial', 'COM'),
  ('Crewing', 'CRW'),
  ('Engineering', 'ENG'),
  ('Finance', 'FIN'),
  ('Human Resources', 'HR'),
  ('Logistics', 'LOG'),
  ('Marketing', 'MKT'),
  ('Operations', 'OPS'),
  ('Procurement', 'PRO'),
  ('Project', 'PRJ'),
  ('Survey', 'SUR'),
  ('HSEQ', 'HSEQ'),
  ('HSE', 'HSE'),
  ('Quality', 'QA')
on conflict (name) do nothing;

create table if not exists public.ims_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_email text,
  actor_name text,
  action_type text not null,
  target_type text,
  target_reference text,
  summary text,
  created_at timestamptz not null default now()
);

alter table public.ims_company_settings enable row level security;
alter table public.ims_reference_departments enable row level security;
alter table public.ims_reference_projects enable row level security;
alter table public.ims_roles enable row level security;
alter table public.ims_audit_log enable row level security;

drop policy if exists "ims_company_settings_authenticated_all" on public.ims_company_settings;
drop policy if exists "ims_reference_departments_authenticated_all" on public.ims_reference_departments;
drop policy if exists "ims_reference_projects_authenticated_all" on public.ims_reference_projects;
drop policy if exists "ims_roles_authenticated_all" on public.ims_roles;
drop policy if exists "ims_audit_log_authenticated_select_insert" on public.ims_audit_log;

create policy "ims_company_settings_authenticated_all"
on public.ims_company_settings
for all
to authenticated
using (true)
with check (true);

create policy "ims_reference_departments_authenticated_all"
on public.ims_reference_departments
for all
to authenticated
using (true)
with check (true);

create policy "ims_reference_projects_authenticated_all"
on public.ims_reference_projects
for all
to authenticated
using (true)
with check (true);

create policy "ims_roles_authenticated_all"
on public.ims_roles
for all
to authenticated
using (true)
with check (true);

create policy "ims_audit_log_authenticated_select_insert"
on public.ims_audit_log
for all
to authenticated
using (true)
with check (true);
