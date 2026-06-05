-- HSE calendar / planner foundation.
-- Safe to run multiple times. No existing HSE records are modified.

create table if not exists public.hse_calendar_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  planner_type text default 'Inspection',
  inspection_form_ref text,
  inspection_form_title text,
  assigned_to text,
  assigned_person_id uuid,
  frequency text default 'One-off',
  due_date date,
  next_due_date date,
  last_completed_date date,
  reminder_days integer default 7,
  status text default 'Scheduled',
  priority text default 'Medium',
  location text,
  project_work_scope text,
  notes text,
  linked_inspection_id uuid,
  linked_inspection_number text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists hse_calendar_items_next_due_date_idx
  on public.hse_calendar_items (next_due_date);

create index if not exists hse_calendar_items_due_date_idx
  on public.hse_calendar_items (due_date);

create index if not exists hse_calendar_items_assigned_to_idx
  on public.hse_calendar_items (assigned_to);

create index if not exists hse_calendar_items_status_idx
  on public.hse_calendar_items (status);

create index if not exists hse_calendar_items_inspection_form_ref_idx
  on public.hse_calendar_items (inspection_form_ref);
