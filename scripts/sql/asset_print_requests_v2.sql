create extension if not exists pgcrypto;

-- Run after asset_print_requests.sql.
-- 3D Print Requests v2: multiple reference files per object, a dedicated
-- operator/admin roster (independent of IMS user permissions), operator
-- assignment by email, and an audit trail when an admin bypasses the rules.

-- 1) Multiple reference files per object.
create table if not exists public.print_request_object_files (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references public.print_request_objects(id) on delete cascade,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  content_type text,
  uploaded_by text,
  uploaded_at timestamptz not null default now()
);

create index if not exists print_request_object_files_object_idx
  on public.print_request_object_files (object_id);

-- Carry over any single reference file already attached under v1.
insert into public.print_request_object_files (object_id, file_name, file_path, content_type)
select o.id, coalesce(o.reference_file_name, 'Reference file'), o.reference_file_path, o.reference_content_type
from public.print_request_objects o
where o.reference_file_path is not null
  and not exists (
    select 1 from public.print_request_object_files f
    where f.object_id = o.id and f.file_path = o.reference_file_path
  );

-- 2) Assignment by email, and bypass audit.
alter table public.print_request_objects
  add column if not exists operator_email text,
  add column if not exists rules_bypassed_by text,
  add column if not exists rules_bypassed_at timestamptz;

update public.print_request_objects o
set operator_email = lower(p.email)
from public.people p
where o.operator_email is null
  and o.operator_name is not null
  and p.name = o.operator_name
  and p.email is not null;

-- 3) Roster of 3D print operators and admins.
create table if not exists public.print_request_roles (
  id uuid primary key default gen_random_uuid(),
  person_name text not null,
  person_email text not null unique,
  role text not null check (role in ('operator', 'admin')),
  created_at timestamptz not null default now()
);

alter table public.print_request_object_files enable row level security;
drop policy if exists print_request_object_files_authenticated on public.print_request_object_files;
create policy print_request_object_files_authenticated on public.print_request_object_files
  for all to authenticated using (true) with check (true);

alter table public.print_request_roles enable row level security;
drop policy if exists print_request_roles_authenticated on public.print_request_roles;
create policy print_request_roles_authenticated on public.print_request_roles
  for all to authenticated using (true) with check (true);

-- Starting roster. Anyone not found in People is simply skipped; add them from
-- the Team tab on the 3D Print Requests page instead.
insert into public.print_request_roles (person_name, person_email, role)
select p.name, lower(p.email), 'admin'
from public.people p
where lower(p.name) = 'dan fraser' and p.email is not null
on conflict (person_email) do nothing;

insert into public.print_request_roles (person_name, person_email, role)
select p.name, lower(p.email), 'operator'
from public.people p
where lower(p.name) = 'liam burton' and p.email is not null
on conflict (person_email) do nothing;
