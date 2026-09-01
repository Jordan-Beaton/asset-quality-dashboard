-- Inspection Records: three tables
-- Run this in the Supabase SQL editor (Dashboard → SQL Editor)
-- DO NOT run until approved.

-- 1. Main record (one per NOI inspection event)
create table if not exists public.inspection_records (
  id                  uuid primary key default gen_random_uuid(),
  project_key         text not null,
  noi_number          text not null,
  noi_description     text,
  point_snapshots     jsonb not null default '[]',   -- snapshot of selected noi_points rows
  recipients          jsonb not null default '[]',   -- [{name, email}]
  notes               text,
  uploaded_by_name    text,
  last_notified_at    timestamptz,
  last_notified_to    text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 2. Files attached to a record
create table if not exists public.inspection_record_files (
  id          uuid primary key default gen_random_uuid(),
  record_id   uuid not null references public.inspection_records(id) on delete cascade,
  file_name   text not null,
  file_path   text not null,
  file_size   bigint,
  uploaded_at timestamptz not null default now()
);

-- 3. Notification log
create table if not exists public.inspection_record_notifications (
  id                 uuid primary key default gen_random_uuid(),
  record_id          uuid not null references public.inspection_records(id) on delete cascade,
  sent_to            jsonb not null default '[]',   -- [{name, email}]
  sent_at            timestamptz not null default now(),
  resend_message_id  text,
  sent_by_email      text
);

-- Indexes for fast lookups
create index if not exists idx_inspection_records_project_key on public.inspection_records(project_key);
create index if not exists idx_inspection_records_noi_number  on public.inspection_records(noi_number);
create index if not exists idx_inspection_record_files_record on public.inspection_record_files(record_id);
create index if not exists idx_inspection_record_notifs_record on public.inspection_record_notifications(record_id);

-- updated_at trigger
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger inspection_records_updated_at
  before update on public.inspection_records
  for each row execute procedure public.set_updated_at();

-- RLS: authenticated users can read/write their project's records
alter table public.inspection_records          enable row level security;
alter table public.inspection_record_files     enable row level security;
alter table public.inspection_record_notifications enable row level security;

create policy "auth users full access" on public.inspection_records
  for all to authenticated using (true) with check (true);

create policy "auth users full access" on public.inspection_record_files
  for all to authenticated using (true) with check (true);

create policy "auth users full access" on public.inspection_record_notifications
  for all to authenticated using (true) with check (true);
