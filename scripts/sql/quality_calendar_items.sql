-- Quality calendar manual event foundation.
-- Safe to run multiple times. Existing Quality NCR, audit, and action records are not modified.

create table if not exists public.quality_calendar_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_type text default 'Event',
  assigned_to text,
  assigned_person_id uuid,
  start_date date not null,
  end_date date,
  status text default 'Scheduled',
  priority text default 'Medium',
  location text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.quality_calendar_items enable row level security;

drop policy if exists quality_calendar_items_select_authenticated on public.quality_calendar_items;
create policy quality_calendar_items_select_authenticated
on public.quality_calendar_items
for select
to authenticated
using (true);

drop policy if exists quality_calendar_items_insert_authenticated on public.quality_calendar_items;
create policy quality_calendar_items_insert_authenticated
on public.quality_calendar_items
for insert
to authenticated
with check (true);

drop policy if exists quality_calendar_items_update_authenticated on public.quality_calendar_items;
create policy quality_calendar_items_update_authenticated
on public.quality_calendar_items
for update
to authenticated
using (true)
with check (true);

drop policy if exists quality_calendar_items_delete_authenticated on public.quality_calendar_items;
create policy quality_calendar_items_delete_authenticated
on public.quality_calendar_items
for delete
to authenticated
using (true);

create index if not exists quality_calendar_items_start_date_idx
  on public.quality_calendar_items (start_date);

create index if not exists quality_calendar_items_end_date_idx
  on public.quality_calendar_items (end_date);

create index if not exists quality_calendar_items_event_type_idx
  on public.quality_calendar_items (event_type);

create index if not exists quality_calendar_items_assigned_to_idx
  on public.quality_calendar_items (assigned_to);

create index if not exists quality_calendar_items_status_idx
  on public.quality_calendar_items (status);
