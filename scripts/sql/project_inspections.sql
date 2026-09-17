create extension if not exists pgcrypto;

-- Attendees/location/duration captured against an individual inspection point
-- (project_noi_points), written by NoiCreatorPage in addition to its existing
-- Storage-based noi.json/Word/PDF output, and editable directly from Overall
-- Inspections even before a point has been bundled into an issued NOI. This is
-- purely additive: it does not change anything NoiCreatorPage already saves or
-- how Wadden Sea's dashboard/Project Reports read NOI data.
create table if not exists public.project_noi_attendees (
  id uuid primary key default gen_random_uuid(),
  point_id uuid not null references public.project_noi_points(id) on delete cascade,
  project_key text not null,
  noi_number text,
  attendees jsonb not null default '[]'::jsonb,
  location text,
  duration text,
  notes text,
  updated_at timestamptz not null default now(),
  unique (point_id)
);

alter table public.project_noi_attendees add column if not exists notes text;

alter table public.project_noi_attendees enable row level security;
drop policy if exists project_noi_attendees_authenticated on public.project_noi_attendees;
create policy project_noi_attendees_authenticated on public.project_noi_attendees
  for all to authenticated using (true) with check (true);

-- Attachments for any Overall Inspections row (ITP/NOI-derived or manual).
-- inspection_id matches the InspectionEvent.id used on the Overall Inspections
-- page ("noi-<point id>" or "manual-<manual inspection id>"), so one table
-- covers both sources without needing separate evidence tables per source.
create table if not exists public.project_inspection_attachments (
  id uuid primary key default gen_random_uuid(),
  inspection_id text not null,
  project_key text not null,
  file_name text not null,
  file_path text not null,
  file_size bigint,
  content_type text,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_by_email text,
  uploaded_at timestamptz not null default now()
);

create index if not exists project_inspection_attachments_inspection_idx
  on public.project_inspection_attachments (inspection_id, uploaded_at desc);

alter table public.project_inspection_attachments enable row level security;
drop policy if exists project_inspection_attachments_authenticated on public.project_inspection_attachments;
create policy project_inspection_attachments_authenticated on public.project_inspection_attachments
  for all to authenticated using (true) with check (true);

-- Manually entered inspections for the Overall Inspections tracker. These cover
-- inspections that are not driven by an ITP/NOI requirement (e.g. client witness
-- visits, ad-hoc audits) but still need to appear on the cross-project lookahead.
-- project_key/project_label are free text so new projects need no code change here.
create table if not exists public.project_manual_inspections (
  id uuid primary key default gen_random_uuid(),
  project_key text not null,
  project_label text not null,
  title text not null,
  description text,
  itp_reference text,
  intervention_type text,
  inspection_date date not null,
  duration text,
  location text,
  status text not null default 'Planned' check (status in ('Planned', 'Confirmed', 'Completed', 'Cancelled', 'NOI Issued')),
  attendees jsonb not null default '[]'::jsonb,
  client_visible boolean not null default true,
  notes text,
  noi_number text,
  supplier text,
  created_by uuid references auth.users(id) on delete set null,
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.project_manual_inspections
  add column if not exists noi_number text;

-- Fallback supplier for a manual inspection that has no ITP reference to
-- resolve one from. When itp_reference matches a known ITP, the app reads
-- that ITP's own supplier instead and ignores this column.
alter table public.project_manual_inspections
  add column if not exists supplier text;

-- Widen the status check constraint to allow "NOI Issued" for tables created
-- before the NOI Creator could generate a Notice of Inspection directly from a
-- manual inspection (see NoiCreatorPage's manual mode).
alter table public.project_manual_inspections drop constraint if exists project_manual_inspections_status_check;
alter table public.project_manual_inspections add constraint project_manual_inspections_status_check
  check (status in ('Planned', 'Confirmed', 'Completed', 'Cancelled', 'NOI Issued'));

create index if not exists project_manual_inspections_date_idx
  on public.project_manual_inspections (inspection_date);
create index if not exists project_manual_inspections_project_idx
  on public.project_manual_inspections (project_key, inspection_date);

alter table public.project_manual_inspections enable row level security;
drop policy if exists project_manual_inspections_authenticated on public.project_manual_inspections;
create policy project_manual_inspections_authenticated on public.project_manual_inspections
  for all to authenticated using (true) with check (true);
